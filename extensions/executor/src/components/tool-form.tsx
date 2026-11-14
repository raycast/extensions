import { WorkspaceAction } from "./workspace-command";
import { workspaceTitle } from "../lib/workspaces";
import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast } from "@raycast/api";
import { Fragment, useMemo, useState } from "react";
import { asJson, codeBlock, titleCase, toolLabel } from "../lib/format";
import {
  buildToolArguments,
  createToolInputPlan,
  initialValuesForPlan,
  parseJsonArguments,
  ToolInputError,
  type ToolFormField,
  type ToolInputPlan,
} from "../lib/schema";
import type { ToolSchema, ToolSummary } from "../lib/types";

export interface ToolFormProps {
  tool: ToolSummary;
  schema: ToolSchema;
  initialArgs?: Record<string, unknown>;
  onSubmit(args: Record<string, unknown>): void;
}

interface PreparedForm {
  plan: ToolInputPlan;
  initialValues: Record<string, unknown>;
  includedFieldIds: Set<string>;
  initialJson: string;
}

function jsonText(value: Record<string, unknown> | undefined): string | undefined {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return undefined;
  }
}

function prepareForm(schema: ToolSchema, initialArgs: Record<string, unknown> | undefined): PreparedForm {
  const plan = createToolInputPlan(schema);
  const initialJson = jsonText(initialArgs);

  if (initialArgs && initialJson === undefined) {
    return {
      plan: { mode: "json", reason: "The saved input is not JSON serializable and cannot be preloaded." },
      initialValues: {},
      includedFieldIds: new Set(),
      initialJson: "",
    };
  }

  if (initialArgs && plan.mode === "fields") {
    const initial = initialValuesForPlan(plan, initialArgs);
    if (!initial) {
      return {
        plan: { mode: "json", reason: "The saved input cannot be represented losslessly by native fields." },
        initialValues: {},
        includedFieldIds: new Set(),
        initialJson: initialJson ?? "",
      };
    }
    return {
      plan,
      initialValues: initial.values,
      includedFieldIds: initial.includedFieldIds,
      initialJson: initialJson ?? "{}",
    };
  }

  if (initialArgs && plan.mode === "empty" && Object.keys(initialArgs).length > 0) {
    return {
      plan: { mode: "json", reason: "The saved input contains values outside the declared empty schema." },
      initialValues: {},
      includedFieldIds: new Set(),
      initialJson: initialJson ?? "{}",
    };
  }

  return {
    plan,
    initialValues: {},
    includedFieldIds: new Set(),
    initialJson: initialJson ?? "",
  };
}

function displayTitle(field: ToolFormField): string {
  if (field.title !== field.path.join(" - ")) return field.title;
  return field.path.map(titleCase).join(" - ");
}

function fieldInfo(field: ToolFormField): string | undefined {
  const requirement = field.required ? "Required." : "Optional.";
  return field.description ? `${requirement} ${field.description}` : requirement;
}

function InputSchemaDetail({ schema }: { schema: ToolSchema }) {
  const sections: string[] = [];
  if (schema.inputTypeScript) {
    sections.push("## TypeScript", codeBlock(schema.inputTypeScript, "typescript"));
  }
  sections.push("## JSON Schema", codeBlock(asJson(schema.inputSchema)));
  return <Detail navigationTitle={workspaceTitle("Input Schema")} markdown={sections.join("\n\n")} />;
}

export function ToolForm({ tool, schema, initialArgs, onSubmit }: ToolFormProps) {
  const prepared = useMemo(() => prepareForm(schema, initialArgs), [schema, initialArgs]);
  const [values, setValues] = useState<Record<string, unknown>>(prepared.initialValues);
  const [includedFieldIds, setIncludedFieldIds] = useState(prepared.includedFieldIds);
  const [json, setJson] = useState(prepared.initialJson || "{}");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function updateField(field: ToolFormField, value: unknown) {
    setValues((current) => ({ ...current, [field.id]: value }));
    setIncludedFieldIds((current) => {
      const next = new Set(current);
      if (field.kind === "enum" && value === "") next.delete(field.id);
      else next.add(field.id);
      return next;
    });
    setErrors((current) => ({ ...current, [field.id]: undefined }));
  }

  function setFieldPresence(field: ToolFormField, present: boolean) {
    setIncludedFieldIds((current) => {
      const next = new Set(current);
      if (present) next.add(field.id);
      else next.delete(field.id);
      return next;
    });
    setErrors((current) => ({ ...current, [field.id]: undefined }));
  }

  function validateField(field: ToolFormField, value: unknown) {
    let message: string | undefined;
    try {
      buildToolArguments({ mode: "fields", fields: [field] }, { [field.id]: value }, includedFieldIds);
    } catch (error) {
      if (error instanceof ToolInputError) message = error.message;
    }
    setErrors((current) => ({ ...current, [field.id]: message }));
  }

  async function submit(formValues: Record<string, unknown>) {
    try {
      const args =
        prepared.plan.mode === "fields"
          ? buildToolArguments(prepared.plan, formValues, includedFieldIds)
          : prepared.plan.mode === "json"
            ? parseJsonArguments(json)
            : {};
      setErrors({});
      onSubmit(args);
    } catch (error) {
      if (error instanceof ToolInputError && error.fieldId) {
        setErrors((current) => ({ ...current, [error.fieldId as string]: error.message }));
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Tool Input",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return (
    <Form
      navigationTitle={workspaceTitle(toolLabel(tool.name))}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review Tool Call" icon={Icon.Eye} onSubmit={submit} />
          {prepared.plan.mode === "json" ? (
            <Action
              title="Format JSON"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={async () => {
                try {
                  setJson(asJson(parseJsonArguments(json)));
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid JSON",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          ) : null}
          <Action.Push title="View Input Schema" icon={Icon.Code} target={<InputSchemaDetail schema={schema} />} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      {prepared.plan.mode === "fields" ? (
        prepared.plan.fields.map((field) => {
          const title = displayTitle(field);
          const info = fieldInfo(field);
          const value = values[field.id];

          const presence =
            !field.required && field.kind !== "enum" ? (
              <Form.Checkbox
                id={`${field.id}_presence`}
                title={title}
                label="Include in Request"
                info={info}
                value={includedFieldIds.has(field.id)}
                onChange={(present) => setFieldPresence(field, present)}
              />
            ) : null;

          if (presence && !includedFieldIds.has(field.id)) return <Fragment key={field.id}>{presence}</Fragment>;

          if (field.kind === "boolean") {
            return (
              <Fragment key={field.id}>
                {presence}
                <Form.Checkbox
                  id={field.id}
                  label={title}
                  info={info}
                  value={typeof value === "boolean" ? value : false}
                  error={errors[field.id]}
                  onChange={(nextValue) => updateField(field, nextValue)}
                  onBlur={(event) => validateField(field, event.target.value)}
                />
              </Fragment>
            );
          }

          if (field.kind === "enum") {
            return (
              <Fragment key={field.id}>
                {presence}
                <Form.Dropdown
                  id={field.id}
                  title={title}
                  info={info}
                  value={typeof value === "string" ? value : ""}
                  error={errors[field.id]}
                  onChange={(nextValue) => updateField(field, nextValue)}
                  onBlur={(event) => validateField(field, event.target.value)}
                >
                  <Form.Dropdown.Item title={field.required ? "Choose…" : "Not Set"} value="" />
                  {field.enumOptions?.map((option) => (
                    <Form.Dropdown.Item key={option.id} title={option.title} value={option.id} />
                  ))}
                </Form.Dropdown>
              </Fragment>
            );
          }

          return (
            <Fragment key={field.id}>
              {presence}
              <Form.TextField
                id={field.id}
                title={title}
                info={info}
                placeholder={field.kind === "string" ? undefined : field.kind === "integer" ? "0" : "0.0"}
                value={typeof value === "string" ? value : ""}
                error={errors[field.id]}
                onChange={(nextValue) => updateField(field, nextValue)}
                onBlur={(event) => validateField(field, event.target.value)}
              />
            </Fragment>
          );
        })
      ) : prepared.plan.mode === "json" ? (
        <>
          <Form.TextArea
            id="arguments"
            title="Arguments JSON"
            placeholder="Tool arguments as a JSON object"
            info={prepared.plan.reason}
            value={json}
            onChange={setJson}
          />
          <Form.Description
            title="Validation"
            text="This fallback checks for valid JSON with an object at the root. Executor remains responsible for full schema validation."
          />
        </>
      ) : (
        <Form.Description title="Arguments" text="This tool declares an empty object input." />
      )}
    </Form>
  );
}

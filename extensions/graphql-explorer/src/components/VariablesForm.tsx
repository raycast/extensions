import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { analyzeDocument, operationLabel } from "../lib/document";
import { clearSchemaCache, loadSchema } from "../lib/schema";
import { Shortcuts } from "../lib/shortcuts";
import { getSavedVariables, setSavedVariables, useStore } from "../lib/store";
import { RawValue, RawVariableValues } from "../lib/types";
import {
  allowsEmptyString,
  buildVariables,
  convertRawValue,
  initialRawValue,
  isCompatible,
  NOT_SET,
  prettyJson,
  usesCheckbox,
  VariableSpec,
} from "../lib/variables";
import { QueryForm } from "./QueryForm";
import { ResultView } from "./ResultView";

interface Props {
  queryId: string;
  environmentId: string;
}

function fieldInfo(spec: VariableSpec): string {
  const lines = [`Type: ${spec.type}`];
  if (spec.hasDefault) lines.push(`Default: ${JSON.stringify(spec.defaultValue)}`);
  lines.push(spec.nonNull && !spec.hasDefault ? "Required" : "Optional: leave empty to omit it");
  if (spec.hint) lines.push("", spec.hint);
  return lines.join("\n");
}

export function VariablesForm({ queryId, environmentId }: Props) {
  const { push } = useNavigation();
  const { queries, environments, isLoading: storeLoading } = useStore();
  const query = queries.find((item) => item.id === queryId);
  const env = environments.find((item) => item.id === environmentId);

  const { data: schemaResult, isLoading: schemaLoading, revalidate: refetchSchema } = usePromise(loadSchema, [env]);
  const { data: saved, isLoading: savedLoading } = usePromise(getSavedVariables, [queryId]);

  const [operationName, setOperationName] = useState<string>();
  const [values, setValues] = useState<RawVariableValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const info = useMemo(
    () => (query ? analyzeDocument(query.query, schemaResult?.schema) : undefined),
    [query?.query, schemaResult],
  );
  const operations = useMemo(
    () => info?.operations.filter((operation) => operation.type !== "subscription") ?? [],
    [info],
  );
  const operation = operations.find((item) => item.name === operationName) ?? operations[0];
  const specs = useMemo(() => operation?.variables ?? [], [operation]);
  const ready = schemaResult !== undefined && saved !== undefined;
  // The effect below has given every variable a value, so all fields are shown and hold the remembered inputs.
  const initialized = ready && specs.every((spec) => values[spec.name] !== undefined);

  // Fill in values for fields that are new or whose kind changed (e.g. after the schema was loaded).
  useEffect(() => {
    if (!ready) return;
    setValues((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const spec of specs) {
        if (!isCompatible(spec, next[spec.name])) {
          next[spec.name] = initialRawValue(spec, saved[spec.name]);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [ready, specs, saved]);

  function updateValue(spec: VariableSpec, value: RawValue) {
    setValues((previous) => ({ ...previous, [spec.name]: value }));
    // Validate JSON while typing; for other fields only clear an error once it is fixed.
    const empty = typeof value === "string" && value.trim() === "";
    if (spec.kind === "json" || errors[spec.name]) {
      const result = convertRawValue(spec, value);
      const message = "error" in result && !(empty && !errors[spec.name]) ? result.error : undefined;
      setErrors((previous) => {
        if (previous[spec.name] === message) return previous;
        const next = { ...previous };
        if (message) next[spec.name] = message;
        else delete next[spec.name];
        return next;
      });
    }
  }

  async function handleRun() {
    if (!query || !env || !operation) return;
    if (!initialized) {
      // Running now would skip the remembered values, and saving would replace them with an empty set.
      await showToast({ style: Toast.Style.Failure, title: "Variables are still loading" });
      return;
    }
    const result = buildVariables(specs, values);
    setErrors(result.errors);
    const invalid = Object.keys(result.errors);
    if (invalid.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Check ${invalid.length === 1 ? "variable" : "variables"} ${invalid.map((name) => `$${name}`).join(", ")}`,
      });
      return;
    }
    try {
      await setSavedVariables(query.id, { ...saved, ...values });
    } catch (error) {
      // Remembering the values is a convenience: report the failure, but still run the query.
      await showFailureToast(error, { title: "Could not save variable values" });
    }
    push(
      <ResultView
        title={query.name}
        env={env}
        fileName={query.id}
        request={{ query: query.query, variables: result.variables, operationName: operation.name }}
      />,
    );
  }

  function handleFormatJson() {
    setValues((previous) => {
      const next = { ...previous };
      for (const spec of specs) {
        const value = next[spec.name];
        if (spec.kind === "json" && typeof value === "string") next[spec.name] = prettyJson(value);
      }
      return next;
    });
  }

  function handleReset() {
    setErrors({});
    setValues((previous) => {
      const next = { ...previous };
      for (const spec of specs) next[spec.name] = initialRawValue(spec);
      return next;
    });
  }

  async function handleReloadSchema() {
    if (!env) return;
    try {
      await clearSchemaCache(env);
    } catch (error) {
      await showFailureToast(error, { title: "Could not reload schema" });
      return;
    }
    refetchSchema();
  }

  if (!storeLoading && (!query || !env)) {
    return (
      <Form>
        <Form.Description
          title="Not found"
          text={!query ? "This query no longer exists." : "The environment of this query no longer exists."}
        />
      </Form>
    );
  }

  const hasJsonFields = specs.some((spec) => spec.kind === "json");

  return (
    <Form
      navigationTitle={query ? `Run ${query.name}` : "Run Query"}
      isLoading={storeLoading || schemaLoading || savedLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.Play} onSubmit={handleRun} />
          {hasJsonFields && (
            <Action title="Format JSON" icon={Icon.Wand} shortcut={Shortcuts.Format} onAction={handleFormatJson} />
          )}
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowCounterClockwise}
            shortcut={Shortcuts.Reset}
            onAction={handleReset}
          />
          <Action
            title="Reload Schema"
            icon={Icon.ArrowClockwise}
            shortcut={Shortcuts.ReloadSchema}
            onAction={handleReloadSchema}
          />
          {query && (
            <Action.Push
              title="Edit Query"
              icon={Icon.Pencil}
              shortcut={Shortcuts.Edit}
              target={<QueryForm query={query} />}
            />
          )}
        </ActionPanel>
      }
    >
      {env && <Form.Description title="Environment" text={`${env.name} · ${env.url}`} />}
      {schemaResult?.error && (
        <Form.Description
          title="Schema"
          text={`Introspection unavailable (${schemaResult.error}). Field types are inferred from the query.`}
        />
      )}
      {info?.error && <Form.Description title="Error" text={`⚠️ ${info.error}`} />}

      {operations.length > 1 && (
        <Form.Dropdown
          id="__operation"
          title="Operation"
          value={operation?.name ?? ""}
          onChange={(value) => setOperationName(value)}
        >
          {operations.map((item) => (
            <Form.Dropdown.Item key={item.name ?? ""} value={item.name ?? ""} title={operationLabel(item)} />
          ))}
        </Form.Dropdown>
      )}

      {ready && specs.length === 0 && operation && (
        <Form.Description title="Variables" text="This operation has no variables. Press ⌘↵ to run it." />
      )}

      {ready && specs.length > 0 && <Form.Separator />}

      {ready &&
        specs.map((spec) =>
          values[spec.name] === undefined ? null : (
            <VariableField
              key={`${operation?.name ?? ""}:${spec.name}:${spec.kind}:${usesCheckbox(spec)}`}
              spec={spec}
              value={values[spec.name]}
              error={errors[spec.name]}
              onChange={(value) => updateValue(spec, value)}
            />
          ),
        )}
    </Form>
  );
}

interface FieldProps {
  spec: VariableSpec;
  value: RawValue;
  error?: string;
  onChange: (value: RawValue) => void;
}

function VariableField({ spec, value, error, onChange }: FieldProps): ReactElement {
  const common = { id: `var:${spec.name}`, title: spec.name, info: fieldInfo(spec), error };

  if (usesCheckbox(spec)) {
    return <Form.Checkbox {...common} label={spec.type} value={value === true} onChange={onChange} />;
  }

  if (spec.kind === "boolean" || spec.kind === "enum") {
    const options = spec.kind === "boolean" ? ["true", "false"] : (spec.enumValues ?? []);
    return (
      <Form.Dropdown {...common} value={String(value)} onChange={onChange}>
        {!spec.nonNull && <Form.Dropdown.Item value={NOT_SET} title="— not set —" />}
        {options.map((option) => (
          <Form.Dropdown.Item key={option} value={option} title={option} />
        ))}
      </Form.Dropdown>
    );
  }

  if (spec.kind === "json") {
    return (
      <Form.TextArea
        {...common}
        title={`${spec.name} (JSON)`}
        placeholder={spec.template || "{}"}
        value={String(value)}
        onChange={onChange}
      />
    );
  }

  if (allowsEmptyString(spec)) {
    const required = spec.nonNull && !spec.hasDefault;
    return (
      <>
        <Form.TextField
          {...common}
          placeholder={spec.type}
          value={typeof value === "string" ? value : ""}
          // Clearing the field goes back to "not set": "" is only sent when the checkbox below asks for it.
          onChange={(text) => onChange(text === "" && value !== "" ? null : text)}
        />
        {(value === null || value === "") && (
          <Form.Checkbox
            id={`empty:${spec.name}`}
            label="Send as empty string"
            info={`Checked: $${spec.name} is sent as "". Unchecked: ${required ? "it is reported as missing" : "it is omitted"}.`}
            value={value === ""}
            onChange={(checked) => onChange(checked ? "" : null)}
          />
        )}
      </>
    );
  }

  return <Form.TextField {...common} placeholder={spec.type} value={String(value)} onChange={onChange} />;
}

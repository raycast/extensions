import { ActionPanel, Action, List, Icon, closeMainWindow, Form, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { actions } from "bettertouchtool";
import { actionCatalog, type ActionDefinition, type ActionParamDoc } from "bettertouchtool/catalog";
import { createBttClient } from "./btt";

type FormValue = string | boolean;
type FormValues = Record<string, FormValue>;
type ParameterKind = "boolean" | "json" | "number" | "text";

interface ParameterField {
  definition: ActionParamDoc;
  initialValue: unknown;
  kind: ParameterKind;
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search actions..." throttle>
      <List.Section title="Actions" subtitle={String(actionCatalog.all.length)}>
        {actionCatalog.all.map((actionDefinition) => (
          <ActionItem key={actionDefinition.id} actionDefinition={actionDefinition} />
        ))}
      </List.Section>
    </List>
  );
}

function ActionForm({ actionDefinition }: { actionDefinition: ActionDefinition }) {
  const fields = getParameterFields(actionDefinition);

  async function handleSubmit(values: FormValues) {
    try {
      const extra = fields.reduce<Record<string, unknown>>((result, field) => {
        const value = parseFormValue(values[field.definition.key], field);
        return value === undefined ? result : { ...result, [field.definition.key]: value };
      }, {});

      await createBttClient().triggerAction(actions.action(actionDefinition.id, extra));
    } catch (error) {
      await showFailureToast(error, { title: "Failed to run action" });
    }
  }

  return (
    <Form
      navigationTitle={actionDefinition.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Action" onSubmit={handleSubmit} icon={Icon.PlayFilled} />
        </ActionPanel>
      }
    >
      <Form.Description title={actionDefinition.name} text={actionDefinition.description} />
      <Form.Separator />
      {fields.map((field) => (
        <ParameterInput key={field.definition.key} field={field} />
      ))}
    </Form>
  );
}

function ParameterInput({ field }: { field: ParameterField }) {
  const { definition, initialValue, kind } = field;

  if (kind === "boolean") {
    return (
      <Form.Checkbox
        id={definition.key}
        title={definition.key}
        label={definition.description || definition.key}
        defaultValue={Boolean(initialValue)}
      />
    );
  }

  if (kind === "json") {
    return (
      <Form.TextArea
        id={definition.key}
        title={definition.key}
        info={definition.description}
        defaultValue={formatInitialValue(initialValue, kind)}
        placeholder="JSON object or array"
      />
    );
  }

  return (
    <Form.TextField
      id={definition.key}
      title={definition.key}
      info={definition.description}
      defaultValue={formatInitialValue(initialValue, kind)}
      placeholder={kind === "number" ? "Enter a number" : "Enter a value"}
    />
  );
}

function ActionItem({ actionDefinition }: { actionDefinition: ActionDefinition }) {
  const { push } = useNavigation();
  const fields = getParameterFields(actionDefinition);

  async function handleRun(closeWindow = false) {
    if (fields.length > 0) {
      push(<ActionForm actionDefinition={actionDefinition} />);
      return;
    }

    if (closeWindow) {
      await closeMainWindow();
    }

    try {
      await createBttClient().triggerAction(actions.action(actionDefinition.id), { waitForReply: !closeWindow });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to run action" });
    }
  }

  return (
    <List.Item
      id={String(actionDefinition.id)}
      title={actionDefinition.name}
      subtitle={actionDefinition.description}
      icon={Icon.CommandSymbol}
      accessories={[{ tag: actionDefinition.category }, { text: String(actionDefinition.id), icon: Icon.Hashtag }]}
      keywords={[actionDefinition.slug, actionDefinition.category]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={fields.length > 0 ? "Configure Action" : "Run Action with BTT"}
              onAction={() => handleRun()}
              icon={fields.length > 0 ? Icon.Gear : Icon.PlayFilled}
            />
            {fields.length === 0 ? (
              <Action title="Run Action in Background" onAction={() => handleRun(true)} icon={Icon.Play} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getParameterFields(actionDefinition: ActionDefinition): ParameterField[] {
  const parameters = new Map<string, ActionParamDoc>();
  for (const parameter of actionDefinition.params) {
    if (parameter.key !== "BTTPredefinedActionType" && !parameters.has(parameter.key)) {
      parameters.set(parameter.key, parameter);
    }
  }

  return [...parameters.values()].map((definition) => {
    const initialValue = actionDefinition.example?.[definition.key];
    return { definition, initialValue, kind: inferParameterKind(definition, initialValue) };
  });
}

function inferParameterKind(definition: ActionParamDoc, initialValue: unknown): ParameterKind {
  if (typeof initialValue === "boolean" || /boolean/i.test(definition.description)) return "boolean";
  if (definition.children?.length || (initialValue !== null && typeof initialValue === "object")) return "json";
  if (typeof initialValue === "number" || /\b(number|seconds|amount|duration)\b/i.test(definition.description)) {
    return "number";
  }
  return "text";
}

function formatInitialValue(value: unknown, kind: ParameterKind): string {
  if (value === undefined || value === null) return "";
  if (kind === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseFormValue(value: FormValue | undefined, field: ParameterField): unknown {
  if (field.kind === "boolean") {
    return field.initialValue === undefined && value === false ? undefined : Boolean(value);
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  if (field.kind === "json") return JSON.parse(value);
  if (field.kind === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field.definition.key} must be a valid number`);
    return number;
  }
  return value;
}

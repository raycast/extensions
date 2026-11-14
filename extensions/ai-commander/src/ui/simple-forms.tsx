import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { ArgumentRequirement } from "../prompts/template/render";

function fieldTitle(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function ArgumentField({ argument, itemProps }: { argument: ArgumentRequirement; itemProps: Form.ItemProps<string> }) {
  const options = argument.options ?? [];
  if (options.length === 0) {
    // An empty default makes the argument optional, which the empty field would not show.
    const placeholder = argument.default || (argument.required ? "Value" : "Optional");
    return <Form.TextField {...itemProps} title={fieldTitle(argument.key)} placeholder={placeholder} />;
  }
  return (
    <Form.Dropdown {...itemProps} title={fieldTitle(argument.key)}>
      {options.map((option) => (
        <Form.Dropdown.Item key={option} value={option} title={option} />
      ))}
    </Form.Dropdown>
  );
}

interface ArgumentFormProps {
  promptName: string;
  /** Only for a pushed view. Raycast's guidelines keep the title of a command's root view unchanged. */
  navigationTitle?: string;
  fields: readonly ArgumentRequirement[];
  onSubmit: (values: Record<string, string>) => void;
}

/** Asks for `{argument}` values. Identical names share one field, as `extractRequirements` already merged them. */
export function ArgumentForm({ promptName, navigationTitle, fields, onSubmit }: ArgumentFormProps) {
  const initialValues = Object.fromEntries(
    fields.map((field) => [field.key, field.default ?? field.options?.[0] ?? ""]),
  );
  const { handleSubmit, itemProps } = useForm<Record<string, string>>({
    initialValues,
    validation: Object.fromEntries(
      fields.map((field) => [
        field.key,
        (value?: string) => (field.required && !value?.trim() ? "Required" : undefined),
      ]),
    ),
    onSubmit,
  });

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Prompt" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={promptName} />
      {fields.map((field) => (
        <ArgumentField key={field.key} argument={field} itemProps={itemProps[field.key] as Form.ItemProps<string>} />
      ))}
    </Form>
  );
}

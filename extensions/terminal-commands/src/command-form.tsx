import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

export interface CommandFormValues {
  name: string;
  command: string;
}

function requiredText(value?: string) {
  if (!value?.trim()) {
    return "The item is required";
  }
}

export function CommandForm(props: {
  initialValues?: CommandFormValues;
  onSubmit: (values: CommandFormValues) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CommandFormValues>({
    async onSubmit(values) {
      await props.onSubmit({ name: values.name.trim(), command: values.command.trim() });
      pop();
    },
    initialValues: props.initialValues,
    // FormValidation.Required accepts whitespace-only text, which the submit handler would trim to an empty value.
    validation: {
      name: requiredText,
      command: requiredText,
    },
  });

  return (
    <Form
      navigationTitle={props.initialValues ? "Edit Command" : "Create Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Ping Google DNS" {...itemProps.name} />
      <Form.TextArea title="Command" placeholder={"cd ~/Developer\nls -la"} {...itemProps.command} />
    </Form>
  );
}

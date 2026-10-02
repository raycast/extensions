import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

export interface CommandFormValues {
  name: string;
  command: string;
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
    validation: {
      name: FormValidation.Required,
      command: FormValidation.Required,
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

import { Action, ActionPanel, Form } from "@raycast/api";

type TextInputFormProps = {
  actionTitle: string;
  description?: string;
  onSubmit: (input: string) => void | Promise<void>;
  placeholder: string;
  title: string;
};

type FormValues = {
  input: string;
};

export function TextInputForm({
  actionTitle,
  description,
  onSubmit,
  placeholder,
  title,
}: TextInputFormProps) {
  async function handleSubmit(values: FormValues) {
    await onSubmit(values.input);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={actionTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={title}
    >
      {description ? <Form.Description text={description} /> : null}
      <Form.TextArea
        id="input"
        title="Input"
        placeholder={placeholder}
        autoFocus
      />
    </Form>
  );
}

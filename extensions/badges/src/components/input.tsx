import { Action, ActionPanel, Form } from "@raycast/api";

export const Input = ({
  input,
  inputValid,
  onChange,
  onSubmit,
}: {
  input: { title: string; value?: string };
  inputValid: boolean;
  onChange: (value: string) => void;
  onSubmit: (values: Form.Values) => void;
}) => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Submit ${input.title}`} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={input.title}
        title={input.title}
        defaultValue={input.value}
        placeholder={`Enter your ${input.title}`}
        error={inputValid ? undefined : "This field is required"}
        onChange={onChange}
      />
    </Form>
  );
};

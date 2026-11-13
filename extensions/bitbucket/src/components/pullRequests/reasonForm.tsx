import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

interface ReasonFormProps {
  title: string;
  description: string;
  onSubmit: (reason: string) => void | Promise<void>;
}

export function ReasonForm({ title, description, onSubmit }: ReasonFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            onSubmit={async (values: { reason: string }) => {
              await onSubmit(values.reason);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.TextArea id="reason" title="Reason" placeholder="Optional reason..." />
    </Form>
  );
}

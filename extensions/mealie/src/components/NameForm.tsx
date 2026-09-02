import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

interface NameFormProps {
  title: string;
  submitTitle: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
}

export function NameForm({ title, submitTitle, initialValue = "", onSubmit }: NameFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            onSubmit={async (values: { name: string }) => {
              if (!values.name.trim()) return;
              await onSubmit(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={initialValue} autoFocus />
    </Form>
  );
}

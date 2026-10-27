import { Action, ActionPanel, Form, Icon } from "@raycast/api";

interface ViewNameFormProps {
  n: number;
  navigationTitle: string;
  currentName?: string;
  submitTitle: string;
  description: string;
  onSubmit: (name: string) => Promise<void>;
}

export function ViewNameForm({
  n,
  navigationTitle,
  currentName,
  submitTitle,
  description,
  onSubmit,
}: ViewNameFormProps) {
  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.Check}
            onSubmit={(values: { name: string }) => onSubmit(values.name.trim())}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder={`View ${n}`} defaultValue={currentName ?? ""} />
      <Form.Description text={description} />
    </Form>
  );
}

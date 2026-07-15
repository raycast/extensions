import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";

export default function CustomPromptForm({
  originalText,
  onExecute,
}: {
  originalText: string;
  onExecute: (prompt: string) => void;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Execute Prompt"
            onSubmit={(values: { prompt: string }) => {
              if (values.prompt.trim()) {
                onExecute(values.prompt.trim());
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Custom Prompt"
        placeholder="e.g. Translate this to French and make it formal..."
        autoFocus
      />
      <Form.Separator />
      <Form.Description title="Selected Text" text={originalText} />
    </Form>
  );
}

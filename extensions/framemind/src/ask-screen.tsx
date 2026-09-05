import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { framemind } from "./framemind";
export default function AskScreen() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review in FrameMind"
            onSubmit={async ({ prompt }: { prompt: string }) => {
              const result = await framemind(["ask", "--screen", prompt]);
              await showToast(Toast.Style.Success, result.message);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Question"
        placeholder="What should I know about this screen?"
      />
    </Form>
  );
}

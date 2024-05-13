import { Action, ActionPanel, Form } from "@raycast/api";
import { say } from "mac-say";
import { ConfigureSpokenContent } from "./components/actions.js";

export default function TextToSay() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say"
            onSubmit={async (values) => {
              await say(values.content);
            }}
          />
          <ConfigureSpokenContent />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Text to Say" />
    </Form>
  );
}

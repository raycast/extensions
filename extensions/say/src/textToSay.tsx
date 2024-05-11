import { Action, ActionPanel, Form } from "@raycast/api";
import { execaSync } from "execa";
import { ConfigureSpokenContent } from "./components/actions.js";

export default function TextToSay() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say"
            onSubmit={(values) => {
              execaSync("say", [values.content]);
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

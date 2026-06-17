import { ActionPanel, Form } from "@raycast/api";
import { ConfigureSpokenContent, TextToSpeech } from "./components/actions.js";

export default function TextToSay() {
  return (
    <Form
      actions={
        <ActionPanel>
          <TextToSpeech />
          <ConfigureSpokenContent />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Text to Say" />
    </Form>
  );
}

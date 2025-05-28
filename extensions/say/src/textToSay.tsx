import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { say } from "mac-say";
import { ConfigureSpokenContent } from "./components/actions.js";
import { systemDefault } from "./constants.js";
import { useSaySettings } from "./utils.js";

export default function TextToSay() {
  const { voice, rate, device } = useSaySettings();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.SpeechBubbleActive}
            title="Say"
            onSubmit={async (values) => {
              await say(values.content, {
                voice: voice === systemDefault ? undefined : voice,
                rate: rate === systemDefault ? undefined : parseInt(rate, 10),
                audioDevice: device === systemDefault ? undefined : device,
              });
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

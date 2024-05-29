import { Action, ActionPanel, Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { say } from "mac-say";
import { ConfigureSpokenContent } from "./components/actions.js";
import { systemDefault } from "./constants.js";

export default function TextToSay() {
  const [voice] = useCachedState<string>("voice", systemDefault);
  const [rate] = useCachedState<string>("rate", systemDefault);
  const [audioDevice] = useCachedState<string>("audioDevice", systemDefault);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say"
            onSubmit={async (values) => {
              await say(values.content, {
                voice: voice === systemDefault ? undefined : voice,
                rate: rate === systemDefault ? undefined : parseInt(rate, 10),
                audioDevice: audioDevice === systemDefault ? undefined : audioDevice,
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

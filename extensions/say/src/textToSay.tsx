import { Action, ActionPanel, Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { say } from "mac-say";
import { ConfigureSpokenContent } from "./components/actions.js";
import { defaultVoice } from "./constants.js";

export default function TextToSay() {
  const [voice] = useCachedState<string>("voice", defaultVoice);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say"
            onSubmit={async (values) => {
              await say(values.content, { voice: voice === defaultVoice ? undefined : voice });
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

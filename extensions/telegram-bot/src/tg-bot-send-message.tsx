import { getPreferenceValues, Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { Preferences } from "./preferences";
import { sendMessage } from "./telegram";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Input your message" defaultValue={""} />
    </Form>
  );
}

async function handleSubmit(values: { message: string }) {
  if (values.message == "") {
    return;
  }
  const preferences = getPreferenceValues<Preferences>();
  await sendMessage(values.message, preferences.userID, preferences.botToken);
  popToRoot();
}

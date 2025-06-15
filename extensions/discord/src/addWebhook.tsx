import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { WebhookChannelModel } from "./interface/webhookModel";
import { addWebhook } from "./api/webhookStorage";
import { ColorDropDown } from "./components/colorDropdown";

export default function addWebhookView() {
  function handleSubmit(values: WebhookChannelModel) {
    addWebhook(values);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Webhook" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="" placeholder="Raycast Server, Gaming Server..." title="Channel Name" />
      <Form.TextField id="url" defaultValue="" placeholder="https://discord.com/api/webhooks..." title="Webhook URL" />
      <ColorDropDown />
    </Form>
  );
}

import { Form, ActionPanel, Action } from "@raycast/api";
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
          <Action.SubmitForm title="Submit Webhook" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="" placeholder="Raycast Server, Gaming Server..." title="Channel Name" />
      <Form.TextField id="url" defaultValue="" placeholder="https://discord.com/api/webhooks..." title="Webhook URL" />
      <ColorDropDown />
      <Form.Checkbox id="favourite" label="Add to favourites" defaultValue={false} title="Add to Favourites" />
    </Form>
  );
}

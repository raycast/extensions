import { List, Icon, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { WebhookChannelModel } from "../interface/webhookModel";
import { composeMessage } from "./sendMessage";
import { removeWebhook } from "../api/webhookStorage";

export function SingleWebhookItem(props: { webhook: WebhookChannelModel }) {
  return (
    <List.Item
      key={props.webhook.name}
      title={props.webhook.name}
      subtitle={props.webhook.url}
      icon={{ source: Icon.Message, tintColor: props.webhook.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="Compose Message"
            icon={Icon.Message}
            target={composeMessage(props.webhook.url, props.webhook.name)}
          ></Action.Push>

          <Action
            title="Delete Webhook"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => {
              removeWebhook(props.webhook.name);
              showToast({ title: "Deleted Channel", message: props.webhook.name });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

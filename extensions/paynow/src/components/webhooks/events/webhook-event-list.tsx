import { Action, ActionPanel, List } from "@raycast/api";
import { useStore } from "../../../providers/store-provider/store-provider";
import { useWebhookEventsList } from "../../../queries/webhooks/list-webhook-events.query";
import WebhookEventListItem from "./webhook-event-list-item";
import { withProviders } from "../../../hocs/with-providers";
import WebhookEventDetails from "./webhook-event-details";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export interface WebhookEventListProps {
  webhook: string | ManagementSchemas["WebhookSubscriptionDto"];
}

const WebhookEventList = ({ webhook }: WebhookEventListProps) => {
  const webhookId = typeof webhook === "string" ? webhook : webhook.id;
  const webhookName = typeof webhook === "string" ? webhook : webhook.url;

  const { data: webhookEvents, isLoading } = useWebhookEventsList(webhookId);
  const { store } = useStore();

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Webhook Events • ${webhookName} • ${store?.name || "No Store Selected"}`}
    >
      {webhookEvents?.history.map((event) => (
        <WebhookEventListItem
          key={event.id}
          event={event}
          actions={
            <ActionPanel title={event.id}>
              <Action.Push title="View Event Details" target={<WebhookEventDetails event={event} />} />
              <Action.CopyToClipboard title="Copy Event ID" content={event.id} />
              <Action.CopyToClipboard title="Copy Event Payload" content={JSON.stringify(event.payload)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default withProviders(WebhookEventList);

import { Action, ActionPanel } from "@raycast/api";
import { useStore } from "../../providers/store-provider/store-provider";
import { useWebhooksList } from "../../queries/webhooks/list-webhooks.query";
import ListContainer from "../list-container";
import WebhookEventList from "./events/webhook-event-list";
import WebhookListItem from "./webhook-list-item";

const WebhookList = () => {
  const { data: webhooks, isLoading } = useWebhooksList();
  const { store } = useStore();

  return (
    <ListContainer isLoading={isLoading} navigationTitle={`Webhooks • ${store?.name || "No Store Selected"}`}>
      {webhooks?.map((webhook) => (
        <WebhookListItem
          key={webhook.id}
          webhook={webhook}
          actions={
            <ActionPanel title={webhook.url}>
              <Action.Push title="View Events" target={<WebhookEventList webhook={webhook} />} />
              <Action.CopyToClipboard title="Copy Webhook ID" content={webhook.id} />
              <Action.OpenInBrowser
                title="Open"
                url={`https://dashboard.paynow.gg/webhooks/${webhook.id}?s=${store?.slug}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </ListContainer>
  );
};

export default WebhookList;

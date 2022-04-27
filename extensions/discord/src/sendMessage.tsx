import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { WebhookChannelModel } from "./interface/webhookModel";
import { getWebhooks } from "./api/webhookStorage";
import { SingleWebhookItem } from "./components/singleWebhookItem";

export default function Command() {
  const [webhooks, setWebhooks] = useState<WebhookChannelModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setWebhooks(getWebhooks());
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, [webhooks]);

  return (
    <List searchBarPlaceholder="Search for saved channels" isLoading={isLoading}>
      {
        <List.Section title="Favourites">
          {webhooks
            .filter((w) => w.favourite)
            .map((w) => (
              <SingleWebhookItem key={w.name} webhook={w}></SingleWebhookItem>
            ))}
        </List.Section>
      }
      {
        <List.Section title="Saved Channels">
          {webhooks
            .filter((w) => !w.favourite)
            .map((w) => (
              <SingleWebhookItem key={w.name} webhook={w}></SingleWebhookItem>
            ))}
        </List.Section>
      }
      {!isLoading && webhooks.length == 0 && (
        <List.EmptyView icon={"empty-list-icon.png"} title="Added Webhooks will appear here" />
      )}
    </List>
  );
}

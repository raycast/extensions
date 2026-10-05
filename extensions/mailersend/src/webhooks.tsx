import { List, Icon, Color } from "@raycast/api";
import dayjs from "dayjs";
import { Domain, Webhook } from "./interfaces";
import { useMailerSendPaginated } from "./mailersend";

export default function Webhooks({ domain }: { domain: Domain }) {
  const { isLoading, data: webhooks } = useMailerSendPaginated<Webhook>(`webhooks?domain_id=${domain.id}`);
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Webhooks">
      {webhooks.map((webhook) => (
        <List.Item
          key={webhook.id}
          icon={{
            source: Icon.Plug,
            tintColor: webhook.enabled ? Color.Green : Color.Red,
            tooltip: webhook.enabled ? "Enabled" : "Disabled",
          }}
          title={webhook.name}
          detail={
            <List.Item.Detail
              markdown={webhook.url}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    title="Domain"
                    text={webhook.domain.name}
                    target={`https://${webhook.domain.name}`}
                  />
                  <List.Item.Detail.Metadata.TagList title="Events">
                    {webhook.events.map((event) => (
                      <List.Item.Detail.Metadata.TagList.Item key={event} text={event} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Editable" icon={webhook.editable ? Icon.Check : Icon.Xmark} />
                  <List.Item.Detail.Metadata.Label title="Created At" text={dayjs(webhook.created_at).format("lll")} />
                  <List.Item.Detail.Metadata.Label title="Updated At" text={dayjs(webhook.updated_at).format("lll")} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

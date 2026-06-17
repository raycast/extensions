import { List, ActionPanel, Action, Icon } from "@raycast/api";
import useTriggerHistory from "./hooks/useTriggerHistory";
import { IFormData } from "./interfaces/interfaces";
import { triggerEvent } from "./services/api";

export default function RecentTriggerEvent() {
  const { history: recentTriggers, isLoading } = useTriggerHistory();

  return (
    <List isShowingDetail isLoading={isLoading}>
      {recentTriggers.map((trigger, key) => (
        <TriggerItem key={key} triggerPayload={trigger} />
      ))}
    </List>
  );
}

function TriggerItem({ triggerPayload }: { triggerPayload: IFormData }) {
  async function handleOnAction() {
    await triggerEvent(triggerPayload);
  }

  const identifier = `${triggerPayload.notificationIdentifier}`;
  const domain = `${triggerPayload.requestDomain}`;
  const subscriberId = `****${triggerPayload.subscriberId.slice(triggerPayload.subscriberId.length - 4)}`;
  const apiKey = `****${triggerPayload.apiKey.slice(triggerPayload.apiKey.length - 4)}`;
  const payload = `${triggerPayload.payload}`;

  return (
    <List.Item
      title={identifier}
      icon={{
        source: Icon.Terminal,
      }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Identifier" text={identifier} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Request Domain" text={domain} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="SubscriberId" text={subscriberId} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Api Key" text={apiKey} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Payload" text={payload} />
              <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="Trigger Demo Notification" onAction={handleOnAction} />
        </ActionPanel>
      }
    />
  );
}

import { failToast } from "@chrismessina/raycast-kit";
import { countOf } from "@chrismessina/raycast-kit/plural";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { deleteWebhook, listWebhooks } from "./api/endpoints";
import { satisfied } from "./api/operations";
import type { Webhook } from "./api/types";
import { guard } from "./components/Guard";
import WebhookForm from "./components/WebhookForm";
import { useAttio } from "./hooks/useAttio";
import { friendlyDate } from "./lib/friendly-date";
import { compactWebhookUrl } from "./lib/webhook-url";

const STATUS_COLOR: Record<Webhook["status"], Color | undefined> = {
  active: Color.Green,
  degraded: Color.Orange,
  inactive: Color.SecondaryText,
};

export default function Webhooks() {
  const h = useAttio("listWebhooks", async () => (await listWebhooks()).data, []);
  const { isLoading, data, error, mutate, revalidate, self } = h;
  const webhooks: Webhook[] = data ?? [];
  const canWrite = satisfied(self.granted, "webhook:read-write");
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail-webhooks", true);

  const g = guard(h.guardInput(webhooks.length > 0));
  if (g) return g;

  async function confirmAndDelete(webhook: Webhook) {
    const options: Alert.Options = {
      title: "Delete webhook",
      message: "Are you sure you want to delete this webhook? Any connected services will stop functioning.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete webhook",
      },
    };
    if (!(await confirmAlert(options))) return;
    const { webhook_id } = webhook.id;
    const toast = await showToast(Toast.Style.Animated, "Deleting", webhook_id);
    try {
      await mutate(deleteWebhook(webhook_id), {
        optimisticUpdate(data: Webhook[] | undefined) {
          return (data ?? []).filter((w) => w.id.webhook_id !== webhook_id);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      failToast(toast, error, { title: "Failed" });
    }
  }

  const newWebhookAction = canWrite ? (
    <Action.Push
      icon={Icon.Plus}
      title="New Webhook"
      target={<WebhookForm onSaved={revalidate} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  ) : null;

  const toggleSidebarAction = (
    <Action
      title="Toggle Sidebar"
      icon={Icon.AppWindowSidebarRight}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onAction={() => setShowDetail((v) => !v)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={webhooks.length > 0 && showDetail}
      actions={<ActionPanel>{newWebhookAction}</ActionPanel>}
    >
      {!isLoading && !webhooks.length && !error ? (
        <List.EmptyView
          icon={Icon.Bolt}
          title="No webhooks"
          description="Point Attio events at Zapier, n8n, or your own endpoint."
          actions={<ActionPanel>{newWebhookAction}</ActionPanel>}
        />
      ) : (
        webhooks.map((webhook) => (
          <List.Item
            key={webhook.id.webhook_id}
            icon={{
              source: Icon.Plug,
              tintColor: STATUS_COLOR[webhook.status],
            }}
            title={compactWebhookUrl(webhook.target_url, !showDetail)}
            subtitle={showDetail ? undefined : countOf(webhook.subscriptions.length, "event")}
            keywords={[webhook.target_url]}
            accessories={
              showDetail
                ? undefined
                : [
                    {
                      // API exposes no last-delivery or ping timestamp; created_at is the deliberate substitute.
                      date: new Date(webhook.created_at),
                      tooltip: "Created",
                    },
                    {
                      icon: {
                        source: Icon.Dot,
                        tintColor: STATUS_COLOR[webhook.status],
                      },
                      tooltip: webhook.status,
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Target URL"
                      text={webhook.target_url}
                      target={webhook.target_url}
                    />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={webhook.status}
                        color={STATUS_COLOR[webhook.status]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Created" text={friendlyDate(webhook.created_at)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Subscriptions">
                      {webhook.subscriptions.map((s, i) => (
                        <List.Item.Detail.Metadata.TagList.Item key={i} text={s.event_type} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Edit">
                  {canWrite && (
                    <Action.Push
                      icon={Icon.Pencil}
                      title="Edit Webhook"
                      target={<WebhookForm webhook={webhook} onSaved={revalidate} />}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                  )}
                  {newWebhookAction}
                  {canWrite && (
                    <Action
                      icon={Icon.Trash}
                      title="Delete"
                      onAction={() => confirmAndDelete(webhook)}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard title="Copy Webhook ID" content={webhook.id.webhook_id} />
                  <Action.CopyToClipboard title="Copy Target URL" content={webhook.target_url} />
                </ActionPanel.Section>
                <ActionPanel.Section title="View">{toggleSidebarAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

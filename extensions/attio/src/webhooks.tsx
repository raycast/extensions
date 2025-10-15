import { useCachedPromise } from "@raycast/utils";
import { attio, parseErrorMessage } from "./attio";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { GetV2WebhooksData } from "attio-js/dist/commonjs/models/operations/getv2webhooks";

export default function Webhooks() {
  const {
    isLoading,
    data: webhooks,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.webhooks.list({});
      return data;
    },
    [],
    { initialData: [] },
  );

  async function confirmAndDelete(webhook: GetV2WebhooksData) {
    const options: Alert.Options = {
      title: "Delete webhook",
      message: "Are you sure you want to delete this webhook? Any connected services will stop functioning.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete webhook",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", webhook.id.webhookId);
    try {
      const { webhookId } = webhook.id;
      await mutate(attio.webhooks.delete({ webhookId }), {
        optimisticUpdate(data) {
          return data.filter((w) => w.id.webhookId !== webhookId);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = parseErrorMessage(error);
    }
  }
  return (
    <List isLoading={isLoading}>
      {!isLoading && !webhooks.length && !error ? (
        <List.EmptyView
          icon="empty/webhook.svg"
          title="No webhooks"
          description="Configure webhooks and webhook events"
        />
      ) : (
        webhooks.map((webhook) => (
          <List.Item
            key={webhook.id.webhookId}
            title={webhook.targetUrl}
            accessories={[
              {
                icon: { source: Icon.Dot, tintColor: webhook.status === "active" ? Color.Green : undefined },
                tag: webhook.status,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => confirmAndDelete(webhook)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

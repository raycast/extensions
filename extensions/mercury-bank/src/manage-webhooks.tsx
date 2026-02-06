import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useWebhooks } from "./lib/hooks/useWebhooks";
import { MercuryApi } from "./lib/api";
import { WEBHOOK_EVENTS } from "./lib/constants";

export default function ManageWebhooks() {
  return (
    <FeatureGuard feature="webhooks">
      {(apiKey, accountName) => (
        <WebhooksList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function WebhooksList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: webhooks, isLoading, revalidate } = useWebhooks(apiKey);
  const { push } = useNavigation();

  async function handleDelete(webhookId: string, url: string) {
    if (
      await confirmAlert({
        title: "Delete Webhook",
        message: `Delete webhook "${url}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const api = new MercuryApi(apiKey);
        await api.deleteWebhook(webhookId);
        await showToast({
          style: Toast.Style.Success,
          title: "Webhook deleted",
        });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete webhook",
          message: String(error),
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search webhooks..."
    >
      {!isLoading && webhooks && webhooks.length === 0 && (
        <EmptyView
          title="No Webhooks"
          description="No webhook endpoints configured"
          icon={Icon.Link}
        />
      )}
      <List.Section
        title="Webhooks"
        subtitle={`${(webhooks ?? []).length} endpoints`}
      >
        {(webhooks ?? []).map((webhook) => (
          <List.Item
            key={webhook.id}
            title={webhook.url}
            icon={{ source: Icon.Link, tintColor: Color.Blue }}
            accessories={[
              ...(webhook.eventTypes
                ? [{ text: `${webhook.eventTypes.length} events` }]
                : [{ text: "All events" }]),
              {
                tag: {
                  value: webhook.status,
                  color:
                    webhook.status === "active" ? Color.Green : Color.Orange,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={webhook.url}
                />
                <Action
                  title="Delete Webhook"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(webhook.id, webhook.url)}
                />
                <Action
                  title="Create Webhook"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(
                      <CreateWebhookForm
                        apiKey={apiKey}
                        onCreated={revalidate}
                      />,
                    )
                  }
                />
                <AccountSwitcherActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreateWebhookForm({
  apiKey,
  onCreated,
}: {
  apiKey: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { url: string; events: string[] }) {
    if (!values.url.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.createWebhook({
        url: values.url.trim(),
        eventTypes: values.events.length > 0 ? values.events : null,
      });
      await showToast({ style: Toast.Style.Success, title: "Webhook created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create webhook",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Webhook"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Webhook"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://your-endpoint.com/webhook"
      />
      <Form.TagPicker id="events" title="Event Types">
        {WEBHOOK_EVENTS.map((event) => (
          <Form.TagPicker.Item key={event} title={event} value={event} />
        ))}
      </Form.TagPicker>
      <Form.Description text="Leave events empty to subscribe to all event types." />
    </Form>
  );
}
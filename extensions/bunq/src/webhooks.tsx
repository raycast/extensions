/**
 * Webhooks command for managing notification filters.
 */

import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  Form,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import {
  getNotificationFilters,
  createNotificationFilter,
  deleteNotificationFilter,
  NotificationFilterUrl,
} from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { NotificationCategory } from "./lib/constants";
import { getNotificationCategoryIcon } from "./lib/icon-mapping";
import { formatCategoryName } from "./lib/formatters";

// ============== Create Webhook Form ==============

function CreateWebhookForm({
  session,
  onWebhookCreated,
}: {
  session: ReturnType<typeof useBunqSession>;
  onWebhookCreated: () => void;
}) {
  const { pop } = useNavigation();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("MUTATION");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions: { value: NotificationCategory; title: string }[] = [
    { value: "MUTATION", title: "Mutation (All Account Changes)" },
    { value: "PAYMENT", title: "Payment" },
    { value: "REQUEST", title: "Request" },
    { value: "SCHEDULE_RESULT", title: "Scheduled Payment Result" },
    { value: "SCHEDULE_STATUS", title: "Scheduled Payment Status" },
    { value: "SHARE", title: "Share Invite" },
    { value: "TAB_RESULT", title: "Tab Result" },
    { value: "BUNQME_TAB", title: "bunq.me Tab" },
    { value: "DRAFT_PAYMENT", title: "Draft Payment" },
    { value: "CARD_TRANSACTION_FAILED", title: "Card Transaction Failed" },
    { value: "CARD_TRANSACTION_SUCCESSFUL", title: "Card Transaction Successful" },
  ];

  const handleSubmit = async () => {
    if (!url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid URL format" });
      return;
    }

    // Must be HTTPS
    if (!url.startsWith("https://")) {
      await showToast({ style: Toast.Style.Failure, title: "URL must use HTTPS" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating webhook..." });

      await withSessionRefresh(session, () =>
        createNotificationFilter(
          session.userId!,
          {
            notification_target: url.trim(),
            category: category,
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Webhook created" });
      onWebhookCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create webhook",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Webhook"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Webhook" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new webhook to receive notifications at your URL" />
      <Form.TextField
        id="url"
        title="Webhook URL"
        placeholder="https://your-server.com/webhook"
        value={url}
        onChange={setUrl}
        info="Must be an HTTPS URL"
      />
      <Form.Dropdown
        id="category"
        title="Event Category"
        value={category}
        onChange={(v) => setCategory(v as NotificationCategory)}
      >
        {categoryOptions.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      <Form.Description text="The webhook will receive POST requests when events of the selected category occur." />
    </Form>
  );
}

// ============== Main Component ==============

export default function WebhooksCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();

  const {
    data: webhooks,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (): Promise<NotificationFilterUrl[]> => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getNotificationFilters(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleDelete = useCallback(
    async (webhook: NotificationFilterUrl) => {
      const confirmed = await confirmAlert({
        title: "Delete Webhook",
        message: `Are you sure you want to delete this webhook?\n\nURL: ${webhook.notification_target}\nCategory: ${formatCategoryName(webhook.category)}`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting webhook..." });

        await withSessionRefresh(session, () =>
          deleteNotificationFilter(session.userId!, webhook.id, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: "Webhook deleted" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete webhook",
          message: getErrorMessage(error),
        });
      }
    },
    [session, revalidate],
  );

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Webhooks"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Webhooks">
      <List.Section title="Actions">
        <List.Item
          title="Create Webhook"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Create Webhook"
                icon={Icon.Plus}
                onAction={() => push(<CreateWebhookForm session={session} onWebhookCreated={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {webhooks && webhooks.length > 0 && (
        <List.Section title={`Active Webhooks (${webhooks.length})`}>
          {webhooks.map((webhook) => {
            const icon = getNotificationCategoryIcon(webhook.category);
            return (
              <List.Item
                key={webhook.id}
                title={webhook.notification_target}
                subtitle={formatCategoryName(webhook.category)}
                icon={icon}
                accessories={[
                  { tag: { value: webhook.category, color: Color.SecondaryText } },
                  ...(webhook.created ? [{ date: new Date(webhook.created), tooltip: "Created" }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy URL" content={webhook.notification_target} />
                    <Action
                      title="Delete Webhook"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => handleDelete(webhook)}
                    />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {(!webhooks || webhooks.length === 0) && !isLoading && (
        <List.EmptyView
          icon={Icon.Bell}
          title="No Webhooks"
          description="Create a webhook to receive notifications"
          actions={
            <ActionPanel>
              <Action
                title="Create Webhook"
                icon={Icon.Plus}
                onAction={() => push(<CreateWebhookForm session={session} onWebhookCreated={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

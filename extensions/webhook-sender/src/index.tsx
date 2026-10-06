import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HistoryEntry, SavedWebhook } from "./types";
import { addHistory, clearHistory, deleteHistory, deleteSaved, getHistory, getSaved } from "./storage";
import { WebhookForm } from "./WebhookForm";
import { ResponseView } from "./ResponseView";
import { generateId, relativeTime, sendWebhook, statusColor, truncateUrl } from "./utils";

export default function Command() {
  const { push } = useNavigation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState<SavedWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([getHistory(), getSaved()]);
      setHistory(h);
      setSaved(s);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load webhooks", message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const openNewForm = () => {
    push(<WebhookForm onSent={refresh} />);
  };

  const openFromHistory = (entry: HistoryEntry) => {
    push(<WebhookForm initial={entry.request} onSent={refresh} />);
  };

  const openHistoryResult = (entry: HistoryEntry) => {
    if (entry.error) {
      push(<WebhookForm initial={entry.request} onSent={refresh} />);
      return;
    }
    push(
      <ResponseView
        status={entry.responseStatus ?? 0}
        body={entry.responseBody ?? ""}
        responseTime={entry.responseTime ?? 0}
        request={entry.request}
        onEditInForm={() => push(<WebhookForm initial={entry.request} onSent={refresh} />)}
      />,
    );
  };

  const openFromSaved = (webhook: SavedWebhook) => {
    push(
      <WebhookForm
        initial={webhook.request}
        initialSavedId={webhook.id}
        initialSavedName={webhook.name}
        onSent={refresh}
      />,
    );
  };

  const handleSendSaved = async (webhook: SavedWebhook) => {
    const { request } = webhook;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Sending "${webhook.name}"…` });
    try {
      const result = await sendWebhook(request);
      await addHistory({
        id: generateId(),
        timestamp: Date.now(),
        request,
        responseStatus: result.status,
        responseBody: result.body,
        responseTime: result.responseTime,
      });
      await toast.hide();
      await refresh();
      push(
        <ResponseView
          status={result.status}
          body={result.body}
          responseTime={result.responseTime}
          request={request}
          onEditInForm={() => openFromSaved(webhook)}
        />,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await addHistory({ id: generateId(), timestamp: Date.now(), request, error: message });
      await refresh();
      toast.style = Toast.Style.Failure;
      toast.title = "Request failed";
      toast.message = message;
    }
  };

  const handleDeleteHistory = async (id: string) => {
    await deleteHistory(id);
    await refresh();
  };

  const handleClearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "This will remove all webhook history. This cannot be undone.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await clearHistory();
      await refresh();
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  };

  const handleDeleteSaved = async (id: string, name: string) => {
    const confirmed = await confirmAlert({
      title: `Delete "${name}"?`,
      message: "This saved webhook will be removed permanently.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await deleteSaved(id);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: `Deleted "${name}"`,
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search webhooks…">
      {/* ── New Webhook ── */}
      <List.Section title="Actions">
        <List.Item
          title="Send New Webhook"
          subtitle="Open the webhook form"
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Send New Webhook" icon={Icon.ArrowRight} onAction={openNewForm} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* ── Saved ── */}
      {saved.length > 0 && (
        <List.Section title="Saved Webhooks" subtitle={`${saved.length} saved`}>
          {saved.map((webhook) => (
            <List.Item
              key={webhook.id}
              title={webhook.name}
              subtitle={`${webhook.request.method}  ${truncateUrl(webhook.request.url, 45)}`}
              icon={{ source: Icon.Bookmark, tintColor: Color.Purple }}
              accessories={[
                {
                  text: webhook.request.method,
                  tooltip: "HTTP Method",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Send Webhook" icon={Icon.ArrowRight} onAction={() => handleSendSaved(webhook)} />
                  <Action
                    title="Open in Form"
                    icon={Icon.Pencil}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "return" },
                      Windows: { modifiers: ["ctrl"], key: "s" },
                    }}
                    onAction={() => openFromSaved(webhook)}
                  />
                  <Action
                    title="Delete Saved Webhook"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "d" },
                      Windows: { modifiers: ["ctrl"], key: "d" },
                    }}
                    onAction={() => handleDeleteSaved(webhook.id, webhook.name)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <List.Section title="Recent History" subtitle={`${history.length} entries`}>
          {history.map((entry) => {
            const statusEmoji = entry.error ? "🔴" : entry.responseStatus ? statusColor(entry.responseStatus) : "⚪";

            const statusText = entry.error ? "Failed" : entry.responseStatus ? `${entry.responseStatus}` : "";

            return (
              <List.Item
                key={entry.id}
                title={truncateUrl(entry.request.url, 50)}
                subtitle={entry.request.method}
                icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                accessories={[
                  {
                    text: `${statusEmoji} ${statusText}`,
                    tooltip: "Response status",
                  },
                  {
                    text: relativeTime(entry.timestamp),
                    tooltip: new Date(entry.timestamp).toLocaleString("en-US"),
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={entry.error ? "Open in Form (Failed)" : "View Response"}
                      icon={entry.error ? Icon.Pencil : Icon.Eye}
                      onAction={() => openHistoryResult(entry)}
                    />
                    <Action
                      title="Edit in Form"
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "return" },
                        Windows: { modifiers: ["ctrl"], key: "s" },
                      }}
                      onAction={() => openFromHistory(entry)}
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "d" },
                        Windows: { modifiers: ["ctrl"], key: "d" },
                      }}
                      onAction={() => handleDeleteHistory(entry.id)}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "d" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      }}
                      onAction={handleClearHistory}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* ── Empty states ── */}
      {!isLoading && saved.length === 0 && history.length === 0 && (
        <List.EmptyView
          icon={Icon.ArrowRight}
          title="No webhooks yet"
          description="Press Enter to send your first webhook"
          actions={
            <ActionPanel>
              <Action title="Send New Webhook" onAction={openNewForm} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

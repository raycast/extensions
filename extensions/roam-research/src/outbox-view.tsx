import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { clearSyncedItems, deleteOutboxItem, retryOutboxItem, processOutboxQueue, getOutboxItems } from "./outbox";
import { useGraphsConfig, crossPlatformShortcut } from "./utils";
import { dateToPageTitle } from "./roam-api-sdk-copy";

const STATUS_CONFIG: Record<OutboxItemStatus, { icon: Icon; tint: Color; label: string }> = {
  pending: { icon: Icon.Clock, tint: Color.Yellow, label: "Pending" },
  failed: { icon: Icon.XMarkCircle, tint: Color.Red, label: "Failed" },
  synced: { icon: Icon.Checkmark, tint: Color.Green, label: "Synced" },
};

type FilterValue = "all" | OutboxItemStatus;

function pageTitleDisplay(pageTitle: string | { "daily-note-page": string }): string {
  if (typeof pageTitle === "string") return pageTitle;
  const [mm, dd, yyyy] = pageTitle["daily-note-page"].split("-");
  const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  return dateToPageTitle(date) || pageTitle["daily-note-page"];
}

function itemDetailMarkdown(item: OutboxItem): string {
  const path = [`**${item.graphName}**`, `**${pageTitleDisplay(item.pageTitle)}**`];
  if (item.nestUnder) path.push(`**${item.nestUnder}**`);
  return [path.join("  >  "), "", "---", "", item.processedContent].join("\n");
}

function ItemMetadata({ item }: { item: OutboxItem }) {
  const config = STATUS_CONFIG[item.status];
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={config.label}
        icon={{ source: config.icon, tintColor: config.tint }}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Captured" text={new Date(item.createdAt).toLocaleString("en-US")} />
      {item.updatedAt !== item.createdAt && (
        <List.Item.Detail.Metadata.Label title="Last Updated" text={new Date(item.updatedAt).toLocaleString("en-US")} />
      )}
      {item.templateName && <List.Item.Detail.Metadata.Label title="Template" text={item.templateName} />}
      {item.retryCount > 0 && <List.Item.Detail.Metadata.Label title="Retries" text={String(item.retryCount)} />}
      {item.errorMessage && <List.Item.Detail.Metadata.Label title="Error" text={item.errorMessage} />}
    </List.Item.Detail.Metadata>
  );
}

export default function Command() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const { value: items = [], setValue: setItems, isLoading } = useLocalStorage<OutboxItem[]>("outbox-items", []);
  const { graphsConfig } = useGraphsConfig();

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const pending = filtered.filter((i) => i.status === "pending");
  const failed = filtered.filter((i) => i.status === "failed");
  const synced = filtered.filter((i) => i.status === "synced");

  async function refreshItems() {
    const fresh = await getOutboxItems();
    setItems(fresh);
  }

  async function handleDelete(id: string) {
    await deleteOutboxItem(id);
    await refreshItems();
    showToast({ title: "Deleted", style: Toast.Style.Success });
  }

  async function handleRetry(item: OutboxItem) {
    const graphConfig = graphsConfig[item.graphName];
    if (!graphConfig) {
      showToast({ title: "Graph not found", message: item.graphName, style: Toast.Style.Failure });
      return;
    }
    showToast({ title: "Retrying...", style: Toast.Style.Animated });
    const result = await retryOutboxItem(item.id, graphConfig.tokenField);
    await refreshItems();
    if (result.success) {
      showToast({ title: "Synced!", style: Toast.Style.Success });
    } else {
      showToast({ title: "Retry failed", message: result.error?.message, style: Toast.Style.Failure });
    }
  }

  async function handleRetryAll() {
    const pendingItems = items.filter((i) => i.status === "pending");
    if (pendingItems.length === 0) {
      showToast({ title: "No pending items", style: Toast.Style.Success });
      return;
    }
    showToast({ title: "Retrying all pending...", style: Toast.Style.Animated });
    const result = await processOutboxQueue(graphsConfig);
    await refreshItems();
    showToast({
      title: `${result.synced} synced, ${result.stillPending} pending, ${result.failed} failed`,
      style: result.synced > 0 ? Toast.Style.Success : Toast.Style.Failure,
    });
  }

  async function handleClearSynced() {
    await clearSyncedItems();
    await refreshItems();
    showToast({ title: "Cleared synced history", style: Toast.Style.Success });
  }

  function renderItem(item: OutboxItem) {
    const config = STATUS_CONFIG[item.status];
    const firstLine = item.content.split("\n")[0];
    const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;

    return (
      <List.Item
        key={item.id}
        title={title}
        icon={{ source: config.icon, tintColor: config.tint }}
        accessories={[{ date: new Date(item.createdAt) }]}
        detail={<List.Item.Detail markdown={itemDetailMarkdown(item)} metadata={<ItemMetadata item={item} />} />}
        actions={
          <ActionPanel>
            {(item.status === "failed" && item.isRetryable) || item.status === "pending" ? (
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => handleRetry(item)} />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Content"
              content={item.content}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleDelete(item.id)}
            />
            <Action
              title="Retry All Pending"
              icon={Icon.RotateAntiClockwise}
              shortcut={crossPlatformShortcut(["cmd", "shift"], "r")}
              onAction={handleRetryAll}
            />
            <Action
              title="Clear Synced History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={crossPlatformShortcut(["cmd", "shift"], "d")}
              onAction={handleClearSynced}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by status" value={filter} onChange={(v) => setFilter(v as FilterValue)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Failed" value="failed" />
          <List.Dropdown.Item title="Synced" value="synced" />
        </List.Dropdown>
      }
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title={filter === "all" ? "No captures yet" : `No ${filter} captures`}
          description={
            filter === "all" ? "Captures will appear here after using Quick Capture" : "Try a different filter"
          }
        />
      ) : (
        <>
          {pending.length > 0 && (
            <List.Section title="Pending" subtitle={`${pending.length}`}>
              {pending.map(renderItem)}
            </List.Section>
          )}
          {failed.length > 0 && (
            <List.Section title="Failed" subtitle={`${failed.length}`}>
              {failed.map(renderItem)}
            </List.Section>
          )}
          {synced.length > 0 && (
            <List.Section title="Synced" subtitle={`${synced.length}`}>
              {synced.map(renderItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

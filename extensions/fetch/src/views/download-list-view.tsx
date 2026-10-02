import { countOf } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { DownloadItemActions } from "../actions/download-item-actions";
import { BatchControls, BatchDownloadItem, DownloadStatus, tally } from "../lib/downloader";
import { formatBytes, formatSpeed } from "../lib/progress";

function getStatusIcon(status: DownloadStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case "pending":
      return { source: Icon.Clock, tintColor: Color.SecondaryText };
    case "downloading":
      return { source: Icon.Download, tintColor: Color.Blue };
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "cancelled":
      return { source: Icon.MinusCircle, tintColor: Color.Orange };
  }
}

function getStatusText(item: BatchDownloadItem): string {
  switch (item.status) {
    case "pending":
      return "Pending";
    case "downloading":
      if (item.progress.percent > 0) {
        return `${Math.round(item.progress.percent)}%`;
      }
      return "Starting...";
    case "completed":
      return item.result?.bytesDownloaded ? formatBytes(item.result.bytesDownloaded) : "Completed";
    case "failed":
      return item.error || "Failed";
    case "cancelled":
      return "Cancelled";
  }
}

interface DownloadListViewProps {
  items: BatchDownloadItem[];
  batchHandle: BatchControls | null;
  onRetry: (item: BatchDownloadItem) => void;
  /** Filenames are still being resolved — no rows exist yet. */
  isPreparing?: boolean;
  /** The batch has settled; offer a way back to the form. */
  isFinished?: boolean;
  onStartOver?: () => void;
  /** Abort filename resolution, which runs before any batch handle exists. */
  onCancelPreparation?: () => void;
  navigationTitle?: string;
}

export function DownloadListView({
  items,
  batchHandle,
  onRetry,
  isPreparing = false,
  isFinished = false,
  onStartOver,
  onCancelPreparation,
  navigationTitle = "Batch Download",
}: DownloadListViewProps) {
  // Same tally the batch reports, so the header and the completion toast agree.
  const { completed: completedCount, failed: failedCount } = tally(items);
  const hasActive = items.some((item) => item.status === "downloading" || item.status === "pending");
  const cancelAll = isPreparing
    ? onCancelPreparation
    : hasActive && batchHandle
      ? () => batchHandle.cancel()
      : undefined;

  const globalActions = (
    <>
      {/* One action, two phases: during preflight there is no batch handle to
          cancel yet, only the filename resolution. The two are mutually exclusive
          — no rows exist while preparing — so they share the shortcut safely.

          The shortcut is ⌘⇧. rather than the more obvious ⌘. because ⌘. resolves
          to Common.Pin, which this action is not. */}
      {cancelAll && (
        <Action
          title="Cancel All"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          onAction={cancelAll}
        />
      )}
      {isFinished && onStartOver && (
        <Action
          title="Download More Files"
          icon={Icon.ArrowCounterClockwise}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={onStartOver}
        />
      )}
    </>
  );

  return (
    <List isLoading={isPreparing} navigationTitle={navigationTitle} searchBarPlaceholder="Filter downloads...">
      {items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Download}
          title={isPreparing ? "Resolving Filenames…" : "No Downloads"}
          description={
            isPreparing ? "Checking each URL for its filename and size." : "Downloads will appear here once started."
          }
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      ) : (
        <List.Section
          title="Downloads"
          subtitle={`${completedCount} completed, ${failedCount} failed, ${countOf(items.length, "file")} total`}
        >
          {items.map((item) => (
            <List.Item
              key={item.id}
              title={item.filename}
              subtitle={item.url}
              icon={getStatusIcon(item.status)}
              accessories={[
                ...(item.status === "downloading" && item.progress.speed > 0
                  ? [{ text: formatSpeed(item.progress.speed) }]
                  : []),
                { text: getStatusText(item) },
              ]}
              actions={
                <DownloadItemActions
                  item={item}
                  batchHandle={batchHandle}
                  onRetry={onRetry}
                  globalActions={globalActions}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { HistoryEntry, deleteEntry, loadHistory, togglePin } from "./historyStore";
import { openItems } from "./openLinks";

function sortEntries(entries: HistoryEntry[]): HistoryEntry[] {
  // LD-P4-04: pinned first, then newest-first by timestamp.
  return [...entries].sort((a, b) => {
    if ((a.pinned === true) !== (b.pinned === true)) return a.pinned === true ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
}

function formatBreakdown(typesBreakdown: Record<string, number>): string {
  // Stable order: web first, then alphabetical for the rest. Per LD-P4-04 accessories.
  const entries = Object.entries(typesBreakdown).sort(([a], [b]) => {
    if (a === "web") return -1;
    if (b === "web") return 1;
    return a.localeCompare(b);
  });
  return entries.map(([type, n]) => `${type}×${n}`).join(" ");
}

function sourceIcon(source: HistoryEntry["source"]): Icon {
  switch (source) {
    case "clipboard":
      return Icon.Clipboard;
    case "selection":
      return Icon.TextCursor;
    case "filter":
      return Icon.Filter;
    case "history":
      return Icon.Clock;
    default:
      return Icon.Globe;
  }
}

export default function HistoryCommand() {
  const { data, isLoading, mutate } = usePromise(loadHistory);
  const entries = data ?? [];
  const display = sortEntries(entries);

  async function openAllAgain(entry: HistoryEntry) {
    // LD-P4-06: openItems with skipRecording=true (avoid double-recording on replay).
    const items = entry.items.map((i, index) => ({ ...i, index }));
    const result = await openItems(items, { source: "history", skipRecording: true });
    if (result.cancelled) return;
    if (result.failed > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened ${result.opened} of ${result.total}`,
        message: "Some links failed (file missing or no app handler)",
      });
      return;
    }
    if (result.total === 0) {
      await showToast({
        title: "Nothing to open",
        message: "Entry filtered to zero items by current preferences",
      });
      return;
    }
    await showToast({ title: `Opened ${result.total} link${result.total === 1 ? "" : "s"}` });
  }

  async function copyUrls(entry: HistoryEntry) {
    const text = entry.items.map((i) => i.url).join("\n");
    await Clipboard.copy(text);
    await showToast({
      title: "Copied URLs",
      message: `${entry.items.length} URL${entry.items.length === 1 ? "" : "s"}`,
    });
  }

  async function onPinToggle(entry: HistoryEntry) {
    // LD-P4-05 + LD-P4-13: optimistic mutate so the UI flips instantly.
    await mutate(togglePin(entry.id).then(loadHistory), {
      optimisticUpdate: (cur) =>
        (cur ?? []).map((e) => (e.id === entry.id ? { ...e, pinned: e.pinned === true ? undefined : true } : e)),
    });
  }

  async function onDelete(entry: HistoryEntry) {
    const ok = await confirmAlert({
      title: "Delete this history entry?",
      message: `${entry.totalCount} link${entry.totalCount === 1 ? "" : "s"} from ${new Date(entry.timestamp).toLocaleString()}`,
    });
    if (!ok) return;
    await mutate(deleteEntry(entry.id).then(loadHistory), {
      optimisticUpdate: (cur) => (cur ?? []).filter((e) => e.id !== entry.id),
    });
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history by URL or host">
      {display.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No history yet"
          description="Open a batch of links and they'll appear here."
        />
      ) : (
        display.map((entry) => {
          const isPinned = entry.pinned === true;
          const countLabel = `${entry.items.length} link${entry.items.length === 1 ? "" : "s"}${
            entry.truncated ? ` (of ${entry.totalCount})` : ""
          }`;
          const accessories: List.Item.Accessory[] = [];
          if (isPinned) accessories.push({ icon: Icon.Star, tooltip: "Pinned" });
          const breakdownStr = formatBreakdown(entry.typesBreakdown);
          if (breakdownStr) accessories.push({ tag: breakdownStr });
          accessories.push({ date: new Date(entry.timestamp), tooltip: "Opened" });

          return (
            <List.Item
              key={entry.id}
              icon={sourceIcon(entry.source)}
              title={countLabel}
              subtitle={new Date(entry.timestamp).toLocaleString()}
              keywords={[
                ...entry.items.map((i) => i.raw),
                ...entry.items.map((i) => i.url),
                ...Object.keys(entry.typesBreakdown),
              ]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action title="Open All Again" icon={Icon.Globe} onAction={() => openAllAgain(entry)} />
                  <Action
                    title="Copy Urls"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => copyUrls(entry)}
                  />
                  <Action
                    title={isPinned ? "Unpin" : "Pin"}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => onPinToggle(entry)}
                  />
                  <Action
                    title="Delete Entry"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => onDelete(entry)}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

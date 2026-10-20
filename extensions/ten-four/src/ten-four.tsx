import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getShelf, sortItems, type Item } from "./shelf";
import { createRefreshQueue } from "./refresh-queue";

const shelf = getShelf();

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function preview(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? text;
  return line.trim();
}

function asMarkdown(item: Item): string {
  // Fence the snippet so multiline/whitespace renders verbatim.
  const fence = item.text.includes("```") ? "~~~" : "```";
  return `### ${item.label}\n\n${fence}\n${item.text}\n${fence}`;
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const lastGood = useRef<Item[]>([]);
  const reachable = useRef(true);
  const refreshQueue = useRef<ReturnType<typeof createRefreshQueue> | null>(
    null,
  );

  function refresh(followUp = false) {
    if (!refreshQueue.current) {
      refreshQueue.current = createRefreshQueue(async () => {
        // Polls coalesce with an in-flight load. Actions request one follow-up
        // load, so they observe their completed mutation without allowing
        // one-second remote polls to keep this queue alive indefinitely.
        try {
          const data = await shelf.load();
          lastGood.current = data;
          setItems(data);
          reachable.current = true;
        } catch (error) {
          // Keep showing the last-known list instead of blanking, and only
          // toast on the transition from reachable -> unreachable.
          if (reachable.current) {
            showToast({
              style: Toast.Style.Failure,
              title: shelf.isRemote ? "Can't reach shelf" : "Can't read shelf",
              message: error instanceof Error ? error.message : String(error),
            });
          }
          reachable.current = false;
          setItems(lastGood.current);
        }
      });
    }

    return refreshQueue.current({ followUp }).finally(() => {
      setIsLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    return shelf.watch(refresh);
  }, []);

  function toastError(error: unknown) {
    showToast({
      style: Toast.Style.Failure,
      title: "Shelf action failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  async function togglePin(item: Item) {
    try {
      await shelf.setPinned(item, !item.pinned);
      await refresh(true);
    } catch (error) {
      toastError(error);
    }
  }

  async function remove(item: Item) {
    try {
      await shelf.remove(item);
      await refresh(true);
      showToast({ style: Toast.Style.Success, title: "Removed" });
    } catch (error) {
      toastError(error);
    }
  }

  async function clearAll() {
    const ok = await confirmAlert({
      title: "Clear the whole shelf?",
      message: "This removes every snippet, including pinned ones.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    try {
      await shelf.clear();
      await refresh(true);
      showToast({ style: Toast.Style.Success, title: "Shelf cleared" });
    } catch (error) {
      toastError(error);
    }
  }

  const sorted = sortItems(items);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && sorted.length > 0}
      searchBarPlaceholder="Search snippets…"
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="Shelf is empty"
        // Name the backend here: "empty" means something different when the
        // shelf is a file on this Mac than when it is a service that may be
        // unreachable, and it is the fastest way to spot a misread preference.
        description={`Push a snippet from your terminal:  tenfour "your text"\n\nReading ${shelf.isRemote ? "shelf service" : "local file"}: ${shelf.origin}`}
      />
      {sorted.map((item) => (
        <List.Item
          key={item.id}
          icon={
            item.pinned
              ? { source: Icon.Tack, tintColor: Color.Yellow }
              : Icon.Clipboard
          }
          title={item.label}
          subtitle={showDetail ? undefined : preview(item.text)}
          accessories={[{ text: timeAgo(item.ts) }]}
          detail={<List.Item.Detail markdown={asMarkdown(item)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Snippet"
                  content={item.text}
                />
                <Action.Paste title="Paste to Active App" content={item.text} />
                <Action.CopyToClipboard
                  title="Copy Label"
                  content={item.label}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={item.pinned ? "Unpin" : "Pin"}
                  icon={Icon.Tack}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  onAction={() => togglePin(item)}
                />
                <Action
                  title="Toggle Detail"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => setShowDetail((v) => !v)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Snippet"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(item)}
                />
                <Action
                  title="Clear Shelf"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={clearAll}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

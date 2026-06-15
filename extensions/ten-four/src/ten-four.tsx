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
import { useEffect, useState } from "react";
import { homedir } from "os";
import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  watchFile,
  unwatchFile,
  existsSync,
} from "fs";
import { dirname } from "path";

const STORE = process.env.TENFOUR_FILE || join(homedir(), ".ten-four.json");

type Item = {
  id: string;
  label: string;
  text: string;
  ts: number;
  pinned?: boolean;
};

function load(): Item[] {
  try {
    const data = JSON.parse(readFileSync(STORE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function persist(items: Item[]) {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(items, null, 2));
}

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}

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
  const [showDetail, setShowDetail] = useState(true);

  useEffect(() => {
    setItems(load());
    if (existsSync(STORE)) {
      watchFile(STORE, { interval: 400 }, () => setItems(load()));
    } else {
      // poll for the file to appear, then watch it
      const iv = setInterval(() => {
        if (existsSync(STORE)) {
          setItems(load());
          watchFile(STORE, { interval: 400 }, () => setItems(load()));
          clearInterval(iv);
        }
      }, 600);
      return () => {
        clearInterval(iv);
        unwatchFile(STORE);
      };
    }
    return () => unwatchFile(STORE);
  }, []);

  const sorted = sortItems(items);

  // Persist first, then update the UI — that way a failed write leaves the
  // on-disk file and the displayed state in sync. Returns false (with a
  // failure toast) so callers can skip their own success feedback.
  function mutate(next: Item[]): boolean {
    try {
      persist(next);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save shelf",
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
    setItems(next);
    return true;
  }

  function togglePin(item: Item) {
    mutate(
      items.map((i) => (i.id === item.id ? { ...i, pinned: !i.pinned } : i)),
    );
  }

  function remove(item: Item) {
    if (mutate(items.filter((i) => i.id !== item.id))) {
      showToast({ style: Toast.Style.Success, title: "Removed" });
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
    if (ok && mutate([])) {
      showToast({ style: Toast.Style.Success, title: "Shelf cleared" });
    }
  }

  return (
    <List
      isShowingDetail={showDetail && sorted.length > 0}
      searchBarPlaceholder="Search snippets…"
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="Shelf is empty"
        description={`Push a snippet from your terminal:  tenfour "your text"`}
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

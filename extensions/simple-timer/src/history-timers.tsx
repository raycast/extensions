import { useEffect, useState } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  showHUD,
  useNavigation,
  Detail,
  confirmAlert,
  Alert,
} from "@raycast/api";
import {
  HistoryEntry,
  getHistory,
  clearHistory,
  readState,
  writeState,
} from "./timer-state";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function deleteOne(id: string): void {
  const state = readState();
  state.history = state.history.filter((h) => h.id !== id);
  writeState(state);
}

function HistoryDetail({
  entry,
  onDelete,
  onRepeat,
}: {
  entry: HistoryEntry;
  onDelete: () => void;
  onRepeat: () => void;
}) {
  const { pop } = useNavigation();
  const markdown = [
    `# ${entry.label}`,
    ``,
    entry.note ? entry.note : `*No note*`,
    ``,
    `---`,
    ``,
    `**Dismissed:** ${timeAgo(entry.dismissedAt)}`,
  ].join("\n");

  return (
    <Detail
      navigationTitle={entry.label}
      markdown={markdown}
      actions={
        <ActionPanel>
          {entry.note ? (
            <Action.CopyToClipboard
              title="Copy Note to Clipboard"
              content={entry.note}
              shortcut={{ modifiers: [], key: "return" }}
            />
          ) : (
            <Action
              title="No Note to Copy"
              icon={Icon.Minus}
              onAction={() =>
                showHUD("No note — add one when starting a timer")
              }
            />
          )}
          <Action
            title="Delete Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            onAction={() => {
              onDelete();
              pop();
            }}
          />
          <Action
            title={`Repeat ${entry.label}`}
            icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.Blue }}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={() => {
              onRepeat();
              pop();
            }}
          />
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: [], key: "backspace" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}

interface Props {
  onRefresh?: () => void;
  autoPop?: boolean;
  onRepeatTimer?: (entry: HistoryEntry) => void;
}

export function HistoryTimers({
  onRefresh,
  autoPop = false,
  onRepeatTimer,
}: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { push, pop } = useNavigation();

  function refresh() {
    const h = getHistory();
    setHistory(h);
    onRefresh?.();
    if (h.length === 0 && autoPop) pop();
  }

  function handleRepeat(entry: HistoryEntry) {
    if (onRepeatTimer) {
      onRepeatTimer(entry);
    } else {
      showHUD(`▶ ${entry.label} started`);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (history.length === 0) {
    return (
      <List navigationTitle="Timer History">
        <List.EmptyView
          icon={Icon.Clock}
          title="No history yet"
          description="Dismissed timers will appear here"
        />
      </List>
    );
  }

  return (
    <List navigationTitle="Timer History">
      {history.map((t) => (
        <List.Item
          key={t.id}
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          title={t.label}
          subtitle={t.note || undefined}
          accessories={[{ text: timeAgo(t.dismissedAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                icon={Icon.Eye}
                onAction={() =>
                  push(
                    <HistoryDetail
                      entry={t}
                      onDelete={() => {
                        deleteOne(t.id);
                        refresh();
                        showHUD("🗑 Entry deleted");
                      }}
                      onRepeat={() => handleRepeat(t)}
                    />,
                  )
                }
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={() => {
                  deleteOne(t.id);
                  refresh();
                  showHUD("🗑 Entry deleted");
                }}
              />
              <Action
                title={`Repeat ${t.label}`}
                icon={{
                  source: Icon.ArrowCounterClockwise,
                  tintColor: Color.Blue,
                }}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
                onAction={() => handleRepeat(t)}
              />
              <ActionPanel.Section>
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Clear all history?",
                      message: "All timer history will be permanently deleted.",
                      primaryAction: {
                        title: "Clear All",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (confirmed) {
                      clearHistory();
                      setHistory([]);
                      onRefresh?.();
                      pop();
                      showHUD("🗑 History cleared");
                    }
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

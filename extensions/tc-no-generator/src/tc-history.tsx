import React from "react";
import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
  Keyboard,
  launchCommand,
  LaunchType,
} from "@raycast/api";

type HistoryItem = { value: string; ts: number };

export default function Command(): React.JSX.Element {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await LocalStorage.getItem<string>("tc-history");
      const history = raw && raw.length ? (JSON.parse(raw) as HistoryItem[]) : [];
      setItems(history);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async (next: HistoryItem[]) => {
    await LocalStorage.setItem("tc-history", JSON.stringify(next));
    setItems(next);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={async () => {
              await load();
            }}
          />
        </ActionPanel>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView title="No history" description="No stored Turkish IDs yet." />
      ) : (
        items.map((it, idx) => (
          <List.Item
            key={`${it.value}-${it.ts}`}
            title={it.value}
            accessoryTitle={new Date(it.ts).toLocaleString()}
            actions={
              <ActionPanel>
                <Action
                  title="Copy"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={async () => {
                    await Clipboard.copy(it.value);
                    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: it.value });
                  }}
                />
                <Action
                  title="Delete"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: "Delete entry",
                      message: `Delete ${it.value} from history?`,
                    });
                    if (ok) {
                      const next = items.slice();
                      next.splice(idx, 1);
                      await save(next);
                      await showToast({ style: Toast.Style.Success, title: "Deleted" });
                    }
                  }}
                />
                <Action
                  title="Delete All"
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const ok = await confirmAlert({ title: "Delete all history", message: "Delete all stored IDs?" });
                    if (ok) {
                      await save([]);
                      await showToast({ style: Toast.Style.Success, title: "All history deleted" });
                    }
                  }}
                />
                <Action
                  title="Generate New"
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={async () => {
                    await launchCommand({ name: "tc-no-generate", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

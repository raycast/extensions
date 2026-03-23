import { exec } from "child_process";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useRecentlyKilled } from "./hooks/use-recently-killed";
import { formatTimestamp } from "./utils/format";

export default function RecentlyKilled() {
  const { entries, isLoading, removeEntry, clear } = useRecentlyKilled();

  const handleReKill = (name: string) => {
    exec(`pkill -x "${name}"`, (err) => {
      if (err) {
        showToast({
          title: `Failed to kill ${name}`,
          message: "Process may not be running",
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({ title: `Re-killed ${name}`, style: Toast.Style.Success });
    });
  };

  const handleForceReKill = (name: string) => {
    exec(`pkill -9 -x "${name}"`, (err) => {
      if (err) {
        showToast({
          title: `Failed to force kill ${name}`,
          message: "Process may not be running",
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({
        title: `Force re-killed ${name}`,
        style: Toast.Style.Success,
      });
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recently killed..."
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Recently Killed Processes"
          description="Processes you kill will appear here"
          icon={Icon.Clock}
        />
      ) : (
        <List.Section
          title="Recently Killed"
          subtitle={`${entries.length} entries`}
        >
          {entries.map((entry, index) => (
            <List.Item
              key={`${entry.pid}-${entry.killedAt}`}
              title={entry.name}
              subtitle={`PID: ${entry.pid}`}
              accessories={[
                {
                  text: formatTimestamp(entry.killedAt),
                  tooltip: new Date(entry.killedAt).toLocaleString(),
                },
              ]}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action
                    title="Re-Kill (by Name)"
                    icon={Icon.XMarkCircle}
                    onAction={() => handleReKill(entry.name)}
                  />
                  <Action
                    title="Force Re-Kill (by Name)"
                    icon={Icon.XMarkCircleFilled}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => handleForceReKill(entry.name)}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.Minus}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => removeEntry(index)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={clear}
                  />
                  <Action.CopyToClipboard
                    title="Copy Process Name"
                    content={entry.name}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={entry.comm}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

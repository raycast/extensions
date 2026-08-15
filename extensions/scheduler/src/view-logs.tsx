import { ActionPanel, Action, List, Icon, LocalStorage, showToast, Toast, Clipboard, Keyboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { ExecutionLog } from "./types";

export function ViewLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const stored = await LocalStorage.getItem<string>("executionLogs");
      if (stored) {
        const executionLogs = JSON.parse(stored) as ExecutionLog[];
        // Sort by execution time, newest first
        const sortedLogs = executionLogs.sort(
          (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
        );
        setLogs(sortedLogs);
      }
    } catch (error) {
      console.error("Error loading execution logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function clearLogs() {
    const confirmed = await showToast({
      style: Toast.Style.Failure,
      title: "Clear All Logs",
      message: "Are you sure you want to clear all execution logs?",
    });

    if (confirmed) {
      await LocalStorage.removeItem("executionLogs");
      setLogs([]);

      await showToast({
        style: Toast.Style.Success,
        title: "Logs cleared",
      });
    }
  }

  function formatExecutionTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }

  return (
    <List isLoading={isLoading}>
      {logs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Execution Logs"
          description="Execution logs will appear here when scheduled commands run"
        />
      ) : (
        logs.map((log) => (
          <List.Item
            key={log.id}
            icon={log.status === "success" ? Icon.CheckCircle : Icon.XMarkCircle}
            title={log.commandName}
            subtitle={`Executed ${formatExecutionTime(log.executedAt)}`}
            accessories={[
              {
                text: new Date(log.executedAt).toLocaleString(),
                tooltip: `Executed at: ${new Date(log.executedAt).toLocaleString()}`,
              },
              {
                icon: log.status === "success" ? Icon.CheckCircle : Icon.XMarkCircle,
                tooltip: log.status === "success" ? "Success" : "Error",
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Command Name" text={log.commandName} />
                    <List.Item.Detail.Metadata.Label title="Status" text={log.status} />
                    <List.Item.Detail.Metadata.Label
                      title="Executed At"
                      text={new Date(log.executedAt).toLocaleString()}
                    />
                    {log.errorMessage && (
                      <List.Item.Detail.Metadata.Label title="Error Message" text={log.errorMessage} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Log"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={async () => {
                      const logText = [
                        `Command: ${log.commandName}`,
                        `Status: ${log.status}`,
                        `Executed At: ${new Date(log.executedAt).toLocaleString()}`,
                        log.errorMessage ? `Error: ${log.errorMessage}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      await Clipboard.copy(logText);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Log copied to clipboard",
                      });
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Clear Log"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearLogs}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default ViewLogs;

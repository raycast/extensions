import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { join } from "path";
import { parseLogFile } from "./logParser";

export default function ViewLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const logPath = join(homedir(), "Library", "Logs", "Micro Snitch.log");
      const parsedLogs = parseLogFile(logPath);
      setLogs(parsedLogs);

      await showToast({
        style: Toast.Style.Success,
        title: `Loaded ${parsedLogs.length} log entries`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load logs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getIcon = (entry) => {
    if (entry.deviceType === "Audio") return Icon.Microphone;
    if (entry.deviceType === "Video") return Icon.Camera;
    if (entry.deviceType === "System") return Icon.Gear;
    return Icon.QuestionMark;
  };

  const getColor = (entry) => {
    if (entry.eventType === "connected") return Color.Blue;
    if (entry.eventType === "disconnected") return Color.Orange;
    if (entry.eventType === "active") return Color.Green;
    if (entry.eventType === "inactive") return Color.Red;
    if (entry.eventType === "launched") return Color.Green;
    return Color.SecondaryText;
  };

  const getEventDescription = (entry) => {
    const deviceName = entry.message.match(/: (.+)$/)?.[1] || entry.message;

    switch (entry.eventType) {
      case "connected":
        return `🔌 Connected: ${deviceName}`;
      case "disconnected":
        return `❌ Disconnected: ${deviceName}`;
      case "active":
        return `🟢 Activated: ${deviceName}`;
      case "inactive":
        return `🔴 Deactivated: ${deviceName}`;
      case "launched":
        return `🚀 ${entry.message}`;
      default:
        return `📋 ${entry.message}`;
    }
  };

  const filteredLogs = logs.filter((entry) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    const eventDesc = getEventDescription(entry).toLowerCase();
    const message = entry.message.toLowerCase();
    const dateString = entry.dateString.toLowerCase();
    return (
      eventDesc.includes(searchLower) ||
      message.includes(searchLower) ||
      dateString.includes(searchLower)
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Micro Snitch logs..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      filtering={false}
    >
      {filteredLogs.map((entry, index) => (
        <List.Item
          key={index}
          title={getEventDescription(entry)}
          subtitle={entry.dateString}
          accessories={[{ text: formatRelativeTime(entry.timestamp) }]}
          icon={{ source: getIcon(entry), tintColor: getColor(entry) }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Log Entry"
                content={entry.rawLine}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadLogs}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

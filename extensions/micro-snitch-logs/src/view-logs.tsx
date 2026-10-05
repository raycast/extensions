import { List, Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync } from "fs";
import { parseLogFile } from "./logParser";
import { LOG_FILE_PATH } from "./constants";
import { formatRelativeTime, getIcon, getColor, getEventDescription } from "./utils";
import { generateMockLogs } from "./mockData";

export default function ViewLogs() {
  const preferences = getPreferenceValues<Preferences>();

  const {
    data: logs,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      if (preferences.useMockData) {
        return generateMockLogs();
      }

      if (!existsSync(LOG_FILE_PATH)) {
        throw new Error("Micro Snitch log file not found");
      }

      return parseLogFile(LOG_FILE_PATH);
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Micro Snitch logs...">
      {error && !isLoading ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Micro Snitch Not Found"
          description="Micro Snitch app doesn't appear to be installed. Please install Micro Snitch to view logs."
        />
      ) : logs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Log Entries"
          description="No log entries found in Micro Snitch.log"
        />
      ) : (
        <List.Section title="Log Entries" subtitle={`${logs.length}`}>
          {logs.map((entry) => (
            <List.Item
              key={`${entry.timestamp.getTime()}-${entry.rawLine}`}
              title={getEventDescription(entry)}
              subtitle={entry.dateString}
              accessories={[{ text: formatRelativeTime(entry.timestamp) }]}
              icon={{ source: getIcon(entry), tintColor: getColor(entry) }}
              keywords={[entry.message, entry.deviceName, entry.eventType, entry.deviceType, entry.dateString]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Log Entry" content={entry.rawLine} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

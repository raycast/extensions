import { ActionPanel, Action, List, Icon, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEnvironmentLogs } from "../api/environments";
import { LogEntry } from "../types/log";
import { getLogLevelIcon } from "../utils/status-icons";
import { getTimeRangeFrom } from "../utils/dates";

interface Props {
  environmentId: string;
  environmentName: string;
}

const TIME_RANGES = [
  { title: "Last 15 Minutes", value: "time:15m" },
  { title: "Last 1 Hour", value: "time:1h" },
  { title: "Last 6 Hours", value: "time:6h" },
  { title: "Last 24 Hours", value: "time:24h" },
  { title: "Last 7 Days", value: "time:7d" },
];

const LOG_TYPES: { title: string; value: string }[] = [
  { title: "All Types", value: "type:" },
  { title: "Access", value: "type:access" },
  { title: "Application", value: "type:application" },
  { title: "Exception", value: "type:exception" },
  { title: "System", value: "type:system" },
];

export default function LogList({ environmentId, environmentName }: Props) {
  const [timeRange, setTimeRange] = useState("time:1h");
  const [logType, setLogType] = useState("type:");
  const [searchText, setSearchText] = useState("");
  const filterValue = `${timeRange}|${logType}`;

  const { data, isLoading } = useCachedPromise(
    (envId: string, range: string, type: string, query: string) => {
      const rangeValue = range.replace("time:", "");
      const typeValue = type.replace("type:", "");
      return getEnvironmentLogs(envId, {
        from: getTimeRangeFrom(rangeValue),
        to: new Date().toISOString(),
        type: typeValue || undefined,
        query: query || undefined,
      });
    },
    [environmentId, timeRange, logType, searchText],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${environmentName} — Logs`}
      searchBarPlaceholder="Search logs..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filters"
          value={filterValue}
          onChange={(value) => {
            const [time, type] = value.split("|");
            setTimeRange(time);
            setLogType(type);
          }}
        >
          <List.Dropdown.Section title="Time Range">
            {TIME_RANGES.map((range) => (
              <List.Dropdown.Item key={range.value} title={range.title} value={`${range.value}|${logType}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Log Type">
            {LOG_TYPES.map((type) => (
              <List.Dropdown.Item key={type.value} title={type.title} value={`${timeRange}|${type.value}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data?.data.map((entry, index) => (
        <LogListItem key={`${entry.logged_at}-${index}`} entry={entry} />
      ))}
    </List>
  );
}

function LogListItem({ entry }: { entry: LogEntry }) {
  const levelIcon = getLogLevelIcon(entry.level);

  return (
    <List.Item
      icon={{ source: levelIcon.icon, tintColor: levelIcon.color }}
      title={entry.message}
      subtitle={entry.type}
      accessories={[
        { tag: { value: entry.level, color: levelIcon.color } },
        { text: new Date(entry.logged_at).toLocaleTimeString() },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" icon={Icon.Eye} target={<LogDetail entry={entry} />} />
          <Action.CopyToClipboard
            title="Copy Message"
            content={entry.message}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function LogDetail({ entry }: { entry: LogEntry }) {
  const markdown = `# Log Entry

**Level:** ${entry.level}
**Type:** ${entry.type}
**Time:** ${entry.logged_at}

---

\`\`\`
${entry.message}
\`\`\`

${entry.data ? `## Data\n\`\`\`json\n${JSON.stringify(entry.data, null, 2)}\n\`\`\`` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Message" content={entry.message} />
          {entry.data && <Action.CopyToClipboard title="Copy Data" content={JSON.stringify(entry.data, null, 2)} />}
        </ActionPanel>
      }
    />
  );
}

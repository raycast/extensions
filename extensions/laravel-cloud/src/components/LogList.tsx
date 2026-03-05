import { ActionPanel, Action, List, Icon, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEnvironmentLogs } from "../api/environments";
import { LogEntry, LogType } from "../types/log";
import { getLogLevelIcon } from "../utils/status-icons";
import { getTimeRangeFrom } from "../utils/dates";

interface Props {
  environmentId: string;
  environmentName: string;
}

const TIME_RANGES = [
  { title: "Last 15 Minutes", value: "15m" },
  { title: "Last 1 Hour", value: "1h" },
  { title: "Last 6 Hours", value: "6h" },
  { title: "Last 24 Hours", value: "24h" },
  { title: "Last 7 Days", value: "7d" },
];

const LOG_TYPES: { title: string; value: LogType | "" }[] = [
  { title: "All Types", value: "" },
  { title: "Access", value: "access" },
  { title: "Application", value: "application" },
  { title: "Exception", value: "exception" },
  { title: "System", value: "system" },
];

export default function LogList({ environmentId, environmentName }: Props) {
  const [timeRange, setTimeRange] = useState("1h");
  const [logType, setLogType] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(
    (envId: string, range: string, type: string, query: string) =>
      getEnvironmentLogs(envId, {
        from: getTimeRangeFrom(range),
        to: new Date().toISOString(),
        type: type || undefined,
        query: query || undefined,
      }),
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
          onChange={(value) => {
            if (TIME_RANGES.some((r) => r.value === value)) {
              setTimeRange(value);
            } else {
              setLogType(value);
            }
          }}
        >
          <List.Dropdown.Section title="Time Range">
            {TIME_RANGES.map((range) => (
              <List.Dropdown.Item key={range.value} title={range.title} value={range.value} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Log Type">
            {LOG_TYPES.map((type) => (
              <List.Dropdown.Item key={type.value || "all"} title={type.title} value={type.value} />
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

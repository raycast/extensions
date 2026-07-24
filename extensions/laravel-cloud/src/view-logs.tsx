import { ActionPanel, Action, List, Icon, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { useAppEnvSelector } from "./components/app-env-selector";
import { getEnvironmentLogs } from "./api/environments";
import { LogEntry } from "./types/log";
import { getLogLevelIcon } from "./utils/status-icons";
import { getTimeRangeFrom } from "./utils/dates";

const TIME_RANGES = [
  { title: "Last 15 Minutes", value: "15m" },
  { title: "Last 1 Hour", value: "1h" },
  { title: "Last 6 Hours", value: "6h" },
  { title: "Last 24 Hours", value: "24h" },
  { title: "Last 7 Days", value: "7d" },
];

export default function ViewLogs() {
  const { environmentId, isLoading: selectorLoading, Dropdown } = useAppEnvSelector();
  const [timeRange, setTimeRange] = useState("1h");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(
    (envId: string, range: string, query: string) =>
      getEnvironmentLogs(envId, {
        from: getTimeRangeFrom(range),
        to: new Date().toISOString(),
        query: query || undefined,
      }),
    [environmentId, timeRange, searchText],
    { execute: !!environmentId, keepPreviousData: true },
  );

  return (
    <List
      isLoading={selectorLoading || isLoading}
      searchBarPlaceholder="Search logs..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={<Dropdown />}
    >
      <List.Section title="Time Range">
        {TIME_RANGES.map((range) => (
          <List.Item
            key={range.value}
            icon={timeRange === range.value ? Icon.CheckCircle : Icon.Circle}
            title={range.title}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => setTimeRange(range.value)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Logs">
        {data?.data.map((entry, index) => (
          <LogListItem key={`${entry.logged_at}-${index}`} entry={entry} />
        ))}
      </List.Section>
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
        </ActionPanel>
      }
    />
  );
}

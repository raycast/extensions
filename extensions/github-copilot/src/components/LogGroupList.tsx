import { ActionPanel, Action, Icon, List, Color, useNavigation } from "@raycast/api";
import { LogEntryDetail } from "./LogEntryDetail";
import { getToolCallTitle } from "./TaskLogsList";
import { truncate, getLogEntryIcon } from "../utils";
import type { SubAgentGroup, ToolGroup, LogEntry } from "../services/events";
import { groupConsecutiveTools } from "../services/event-grouping";
import type { GroupedLogEntry } from "../services/events";

function getEntryTitle(entry: LogEntry): string {
  if (entry.type === "tool_call") {
    return getToolCallTitle(entry);
  }
  if (entry.type === "user_message") {
    return truncate(entry.content ?? "User message", 80);
  }
  if (entry.type === "assistant_message") {
    return truncate(entry.content ?? "Assistant message", 80);
  }
  if (entry.type === "error") {
    return `Error: ${truncate(entry.content ?? "", 60)}`;
  }
  return truncate(entry.content ?? "Info", 80);
}

function LogEntryItem({ entry }: { entry: LogEntry }) {
  const { push } = useNavigation();
  const icon = getLogEntryIcon(entry);
  const title = getEntryTitle(entry);

  return (
    <List.Item
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title="View Details" icon={Icon.Eye} onAction={() => push(<LogEntryDetail entry={entry} />)} />
        </ActionPanel>
      }
    />
  );
}

function GroupedEntryInGroup({ entry }: { entry: GroupedLogEntry }) {
  const { push } = useNavigation();

  if (entry.kind === "standalone") {
    return <LogEntryItem entry={entry.entry} />;
  }

  if (entry.kind === "tool_group") {
    return (
      <List.Item
        title={entry.title}
        icon={{ source: Icon.Layers, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action title="View Details" icon={Icon.Eye} onAction={() => push(<LogGroupList group={entry} />)} />
          </ActionPanel>
        }
      />
    );
  }

  if (entry.kind === "subagent") {
    return (
      <List.Item
        title={`Subagent: ${entry.agentName}`}
        subtitle={`${entry.entries.length} entries`}
        icon={{ source: Icon.TwoPeople, tintColor: Color.Orange }}
        actions={
          <ActionPanel>
            <Action title="View Details" icon={Icon.Eye} onAction={() => push(<LogGroupList group={entry} />)} />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}

export function LogGroupList({ group }: { group: SubAgentGroup | ToolGroup }) {
  const title = group.kind === "subagent" ? `Subagent: ${group.agentName}` : group.title;

  if (group.kind === "subagent") {
    // For subagent groups, apply tool grouping to their nested entries
    const groupedEntries = groupConsecutiveTools(group.entries);

    return (
      <List navigationTitle={title} searchBarPlaceholder="Search entries...">
        {groupedEntries.map((entry) => (
          <GroupedEntryInGroup key={getGroupedKey(entry)} entry={entry} />
        ))}
      </List>
    );
  }

  // For tool groups, show individual entries directly
  return (
    <List navigationTitle={title} searchBarPlaceholder="Search entries...">
      {group.entries.map((entry) => (
        <LogEntryItem key={entry.id} entry={entry} />
      ))}
    </List>
  );
}

function getGroupedKey(entry: GroupedLogEntry): string {
  switch (entry.kind) {
    case "subagent":
      return entry.id;
    case "tool_group":
      return entry.id;
    case "standalone":
      return entry.entry.id;
  }
}

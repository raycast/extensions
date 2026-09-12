import { useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { withQuery, CacheActions } from "@/components";
import { JiraWorklogForm } from "@/pages";
import { copyToClipboardWithToast, getDateRange } from "@/utils";
import { JIRA_WORKLOG_RANGE } from "@/constants";
import { useJiraWorklogsQuery, useJiraCurrentUser, useRefetchWithToast } from "@/hooks";

export default withQuery(JiraWorklogView);

interface WorklogFilter {
  value: string;
  title: string;
  icon: Icon;
}

const timeRanges: WorklogFilter[] = [
  { value: JIRA_WORKLOG_RANGE.DAILY, title: "Today", icon: Icon.Clock },
  { value: JIRA_WORKLOG_RANGE.WEEKLY, title: "This Week", icon: Icon.Calendar },
  { value: JIRA_WORKLOG_RANGE.MONTHLY, title: "This Month", icon: Icon.Calendar },
];

function JiraWorklogView() {
  const [selectedRangeType, setSelectedRangeType] = useState<string>("");

  const { currentUser } = useJiraCurrentUser();

  const { from, to } = useMemo(() => getDateRange(selectedRangeType || JIRA_WORKLOG_RANGE.WEEKLY), [selectedRangeType]);

  const {
    data: worklogGroups = [],
    isLoading,
    isSuccess,
    refetch,
  } = useJiraWorklogsQuery(
    { userKey: currentUser?.key, from, to },
    {
      enabled: !!currentUser?.key,
      meta: { errorMessage: "Failed to Load Worklog" },
    },
  );

  const refetchWithToast = useRefetchWithToast({ refetch });

  const isEmpty = isSuccess && worklogGroups.length === 0;

  const copyJQL = async () => {
    const issueKeys = [...new Set(worklogGroups.flatMap((group) => group.items.map((item) => item.issueKey)))];

    if (issueKeys.length === 0) {
      await copyToClipboardWithToast("No issues found");
      return;
    }

    const jql = `issuekey in (${issueKeys.join(", ")})`;
    await copyToClipboardWithToast(jql);
  };

  return (
    <List
      throttle
      searchBarPlaceholder="Filter by summary, key, date..."
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Time Range" value={selectedRangeType} onChange={setSelectedRangeType} storeValue>
          {timeRanges.map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} icon={item.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {isEmpty ? (
        <NoWorklogsEmptyView onRefetch={refetchWithToast} />
      ) : (
        worklogGroups.map((group) => (
          <List.Section key={group.date} title={group.title} subtitle={group.subtitle}>
            {group.items.map((item) => (
              <List.Item
                key={item.renderKey}
                keywords={item.keywords}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                accessories={item.accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                    <Action.Push
                      title="Create Worklog"
                      target={<JiraWorklogForm issueKey={item.issueKey} onUpdate={refetchWithToast} />}
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    />
                    <Action.Push
                      title="Edit Worklog"
                      target={
                        <JiraWorklogForm
                          issueKey={item.issueKey}
                          worklogId={item.worklogId}
                          onUpdate={refetchWithToast}
                        />
                      }
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    <Action
                      title="Copy JQL"
                      icon={Icon.CopyClipboard}
                      onAction={() => copyJQL()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refetchWithToast}
                    />
                    <CacheActions />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

interface NoWorklogsEmptyViewProps {
  onRefetch: () => void;
}

function NoWorklogsEmptyView({ onRefetch }: NoWorklogsEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="No worklogs found for selected time range"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefetch} />
        </ActionPanel>
      }
    />
  );
}

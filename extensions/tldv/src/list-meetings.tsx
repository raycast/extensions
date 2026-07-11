import { List, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { useState, useCallback } from "react";
import { DateFilter, Workspace } from "./types";
import {
  useWorkspaces,
  useMeetings,
  useFilteredMeetings,
  usePreferences,
} from "./hooks";
import { MeetingListItem } from "./components";
import { groupMeetingsByDate } from "./utils";

// Date filter options
const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

// Empty state component
function EmptyView({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry?: () => void;
}) {
  return (
    <List.EmptyView
      title={error ? "Failed to load meetings" : "No meetings found"}
      description={error || "Your meetings will appear here once recorded"}
      icon={error ? Icon.ExclamationMark : Icon.Video}
      actions={
        error && onRetry ? (
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// Meetings list with grouping and filtering
function MeetingsListView({ workspace }: { workspace: Workspace }) {
  const prefs = usePreferences();
  const { meetings, isLoading, error, hasMore, loadMore, refresh, clearCache } =
    useMeetings(workspace);
  const { filteredMeetings, dateFilter, setDateFilter, setSearchQuery } =
    useFilteredMeetings(meetings);

  const groupedMeetings = groupMeetingsByDate(filteredMeetings);
  const groupOrder = ["Today", "Yesterday", "This Week", "This Month"];

  // Sort groups: known groups first, then by date descending
  const sortedGroups = Array.from(groupedMeetings.keys()).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.localeCompare(a);
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search meetings..."
      onSearchTextChange={setSearchQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by date"
          value={dateFilter}
          onChange={(value) => setDateFilter(value as DateFilter)}
        >
          {DATE_FILTER_OPTIONS.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.label}
              value={option.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredMeetings.length === 0 && !isLoading ? (
        <EmptyView error={error} onRetry={refresh} />
      ) : (
        sortedGroups.map((group) => (
          <List.Section
            key={group}
            title={group}
            subtitle={`${groupedMeetings.get(group)?.length || 0} meetings`}
          >
            {groupedMeetings.get(group)?.map((meeting) => (
              <MeetingListItem
                key={meeting.id}
                meeting={meeting}
                apiKey={workspace.apiKey}
                dateFormat={prefs.dateFormat || "relative"}
                onLoadMore={hasMore ? loadMore : undefined}
                onRefresh={refresh}
                hasMore={hasMore}
              />
            ))}
          </List.Section>
        ))
      )}
      {/* Footer actions */}
      {filteredMeetings.length > 0 && (
        <List.Section>
          <List.Item
            title=""
            subtitle={
              hasMore
                ? "Load more meetings..."
                : `${filteredMeetings.length} meetings loaded`
            }
            icon={hasMore ? Icon.ArrowDown : Icon.CheckCircle}
            actions={
              <ActionPanel>
                {hasMore && (
                  <Action
                    title="Load More"
                    icon={Icon.ArrowDown}
                    onAction={loadMore}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
                <Action
                  title="Clear Cache"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearCache}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

// Workspace selector with dropdown
function WorkspaceListView() {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaces();
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string>(
    currentWorkspace?.name || workspaces[0]?.name || "",
  );

  const handleWorkspaceChange = useCallback(
    (name: string) => {
      setSelectedWorkspaceName(name);
      const workspace = workspaces.find((w) => w.name === name);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
    },
    [workspaces, setCurrentWorkspace],
  );

  const selectedWorkspace = workspaces.find(
    (w) => w.name === selectedWorkspaceName,
  );

  if (!selectedWorkspace) {
    return (
      <Detail markdown="# No Workspace Selected\n\nPlease select a workspace from the dropdown." />
    );
  }

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search meetings..."
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown
            tooltip="Select workspace"
            value={selectedWorkspaceName}
            onChange={handleWorkspaceChange}
          >
            <List.Dropdown.Section title="Workspaces">
              {workspaces.map((workspace) => (
                <List.Dropdown.Item
                  key={workspace.name}
                  title={workspace.name}
                  value={workspace.name}
                  icon={Icon.Building}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <MeetingsListContent workspace={selectedWorkspace} />
    </List>
  );
}

// Meetings list content (used inside WorkspaceListView)
function MeetingsListContent({ workspace }: { workspace: Workspace }) {
  const prefs = usePreferences();
  const { meetings, isLoading, error, hasMore, loadMore, refresh, clearCache } =
    useMeetings(workspace);
  const { filteredMeetings } = useFilteredMeetings(meetings);

  const groupedMeetings = groupMeetingsByDate(filteredMeetings);
  const groupOrder = ["Today", "Yesterday", "This Week", "This Month"];

  const sortedGroups = Array.from(groupedMeetings.keys()).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.localeCompare(a);
  });

  if (isLoading && meetings.length === 0) {
    return <List.EmptyView title="Loading meetings..." icon={Icon.Clock} />;
  }

  if (filteredMeetings.length === 0 && !isLoading) {
    return <EmptyView error={error} onRetry={refresh} />;
  }

  return (
    <>
      {sortedGroups.map((group) => (
        <List.Section
          key={group}
          title={group}
          subtitle={`${groupedMeetings.get(group)?.length || 0} meetings`}
        >
          {groupedMeetings.get(group)?.map((meeting) => (
            <MeetingListItem
              key={meeting.id}
              meeting={meeting}
              apiKey={workspace.apiKey}
              dateFormat={prefs.dateFormat || "relative"}
              onLoadMore={hasMore ? loadMore : undefined}
              onRefresh={refresh}
              hasMore={hasMore}
            />
          ))}
        </List.Section>
      ))}
      {filteredMeetings.length > 0 && (
        <List.Section>
          <List.Item
            title=""
            subtitle={
              hasMore
                ? "Load more meetings..."
                : `${filteredMeetings.length} meetings loaded`
            }
            icon={hasMore ? Icon.ArrowDown : Icon.CheckCircle}
            actions={
              <ActionPanel>
                {hasMore && (
                  <Action
                    title="Load More"
                    icon={Icon.ArrowDown}
                    onAction={loadMore}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
                <Action
                  title="Clear Cache"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearCache}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </>
  );
}

// Main command
export default function Command() {
  const { workspaces } = useWorkspaces();

  if (workspaces.length === 0) {
    return (
      <Detail
        markdown={`# No API Keys Configured

Please configure your tl;dv API key in the extension preferences.

Go to **Raycast Preferences → Extensions → tl;dv Meetings** and enter your API key.

## How to get your API key

1. Go to [tl;dv](https://tldv.io) and sign in
2. Navigate to Settings → Integrations → API
3. Generate a new API key
4. Copy and paste it in the extension preferences`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Tl;dv" url="https://tldv.io" />
          </ActionPanel>
        }
      />
    );
  }

  if (workspaces.length === 1) {
    return <MeetingsListView workspace={workspaces[0]} />;
  }

  return <WorkspaceListView />;
}

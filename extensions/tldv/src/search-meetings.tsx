import {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useCallback, useMemo } from "react";
import { Workspace } from "./types";
import { useWorkspaces, useMeetings, usePreferences } from "./hooks";
import { MeetingListItem } from "./components";
import { searchMeetings } from "./utils";

// Search command - focuses on search functionality with instant results
export default function SearchMeetingsCommand() {
  const prefs = usePreferences();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaces();
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string>(
    currentWorkspace?.name || workspaces[0]?.name || "",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.name === selectedWorkspaceName),
    [workspaces, selectedWorkspaceName],
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

  if (workspaces.length === 0) {
    return (
      <Detail
        markdown={`# No API Keys Configured

Please configure your tl;dv API key in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Tl;dv" url="https://tldv.io" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search meetings by title, organizer, or participant..."
      onSearchTextChange={setSearchQuery}
      throttle
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
      {selectedWorkspace && (
        <SearchResults
          workspace={selectedWorkspace}
          searchQuery={searchQuery}
          dateFormat={prefs.dateFormat || "relative"}
        />
      )}
    </List>
  );
}

// Search results component
function SearchResults({
  workspace,
  searchQuery,
  dateFormat,
}: {
  workspace: Workspace;
  searchQuery: string;
  dateFormat: "relative" | "absolute";
}) {
  const { meetings, isLoading, error, hasMore, loadMore, refresh } =
    useMeetings(workspace);

  const filteredMeetings = useMemo(() => {
    return searchMeetings(meetings, searchQuery);
  }, [meetings, searchQuery]);

  if (isLoading && meetings.length === 0) {
    return <List.EmptyView title="Loading meetings..." icon={Icon.Clock} />;
  }

  if (error && meetings.length === 0) {
    return (
      <List.EmptyView
        title="Failed to load meetings"
        description={error}
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!searchQuery.trim()) {
    return (
      <List.EmptyView
        title="Start typing to search"
        description="Search by meeting title, organizer name, or participant"
        icon={Icon.MagnifyingGlass}
      />
    );
  }

  if (filteredMeetings.length === 0) {
    return (
      <List.EmptyView
        title="No meetings found"
        description={`No results for "${searchQuery}"`}
        icon={Icon.MagnifyingGlass}
        actions={
          hasMore ? (
            <ActionPanel>
              <Action
                title="Load More Meetings"
                icon={Icon.ArrowDown}
                onAction={async () => {
                  await loadMore();
                  showToast({
                    style: Toast.Style.Success,
                    title: "Loaded more meetings",
                    message: "Try your search again",
                  });
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <List.Section
        title="Search Results"
        subtitle={`${filteredMeetings.length} meetings found`}
      >
        {filteredMeetings.map((meeting) => (
          <MeetingListItem
            key={meeting.id}
            meeting={meeting}
            apiKey={workspace.apiKey}
            dateFormat={dateFormat}
            onRefresh={refresh}
          />
        ))}
      </List.Section>
      {hasMore && (
        <List.Section>
          <List.Item
            title=""
            subtitle="Load more meetings to expand search..."
            icon={Icon.ArrowDown}
            actions={
              <ActionPanel>
                <Action
                  title="Load More"
                  icon={Icon.ArrowDown}
                  onAction={loadMore}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </>
  );
}

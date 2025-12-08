import { List, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getBoards, getActiveSprints, getSprintIssues, getMyself } from "./utils/jira";
// Import Issue type
import { Issue, Preferences } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

interface GroupedIssues {
  [status: string]: Issue[];
}

export default function Command() {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  const { data: boards, isLoading: isLoadingBoards } = usePromise(getBoards);
  const { data: currentUser } = usePromise(getMyself);

  const { data: sprints, isLoading: isLoadingSprints } = usePromise(
    async (boardId: string) => {
      if (!boardId) return [];
      return getActiveSprints(parseInt(boardId));
    },
    [selectedBoardId],
  );

  const activeSprint = sprints && sprints.length > 0 ? sprints[0] : null;

  const { data: issues, isLoading: isLoadingIssues } = usePromise(
    async (sprintId: unknown) => {
      if (!sprintId) return [];
      return getSprintIssues(sprintId as number) as Promise<Issue[]>;
    },
    [activeSprint?.id],
  );

  // Set default board if not selected
  if (boards && boards.length > 0 && !selectedBoardId) {
    setSelectedBoardId(boards[0].id.toString());
  }

  // Group issues by status
  const groupedIssues: GroupedIssues = {};
  const activeSprintIssues: Issue[] = issues || [];
  const myIssues: Issue[] = [];
  let totalIssues = 0;
  let myIssuesCount = 0;

  if (activeSprintIssues) {
    activeSprintIssues.forEach((issue) => {
      const status = issue.fields.status.name;
      if (!groupedIssues[status]) {
        groupedIssues[status] = [];
      }
      groupedIssues[status].push(issue);
      totalIssues++;

      if (issue.fields.assignee?.accountId === currentUser?.accountId) {
        myIssues.push(issue);
        myIssuesCount++;
      }
    });
  }

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const isLoading = isLoadingBoards || isLoadingSprints || isLoadingIssues;

  if (!isLoading && (!boards || boards.length === 0)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Boards Found"
          description="No agile boards found in your Jira instance. Make sure you have access to at least one Scrum or Kanban board."
        />
      </List>
    );
  }

  if (!isLoading && selectedBoardId && (!sprints || sprints.length === 0)) {
    return (
      <List
        searchBarAccessory={
          <List.Dropdown tooltip="Select Board" onChange={setSelectedBoardId} value={selectedBoardId} storeValue>
            {boards?.map((board: { id: number; name: string }) => (
              <List.Dropdown.Item key={board.id} title={board.name} value={board.id.toString()} />
            ))}
          </List.Dropdown>
        }
      >
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Active Sprint"
          description="There are no active sprints on this board. Start a sprint to see issues here."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={activeSprint ? `Sprint: ${activeSprint.name}` : "Active Sprint"}
      searchBarPlaceholder="Search sprint issues..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Board" onChange={setSelectedBoardId} value={selectedBoardId} storeValue>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {boards?.map((board: any) => (
            <List.Dropdown.Item key={board.id} title={board.name} value={board.id.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {activeSprint && (
        <>
          <List.Section title="Sprint Overview">
            <List.Item
              title="Sprint Information"
              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              accessories={[{ text: `${totalIssues} issues` }, { text: `${myIssuesCount} assigned to you` }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={`https://${domain}/secure/RapidBoard.jspa?rapidView=${selectedBoardId}&sprint=${activeSprint.id}`}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="My Issues" subtitle={`${myIssuesCount} issues`}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {myIssues.map((issue: any) => (
              <List.Item
                key={issue.id}
                title={issue.key}
                subtitle={issue.fields.summary}
                icon={issue.fields.issuetype.iconUrl}
                accessories={[{ text: issue.fields.status.name }, { text: issue.fields.priority?.name || "" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
                    <Action.CopyToClipboard content={issue.key} title="Copy Issue Key" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {Object.keys(groupedIssues)
            .sort()
            .map((status) => (
              <List.Section key={status} title={status} subtitle={`${groupedIssues[status].length} issues`}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {groupedIssues[status].map((issue: any) => {
                  const isMyIssue = issue.fields.assignee?.accountId === currentUser?.accountId;
                  return (
                    <List.Item
                      key={issue.id}
                      title={issue.key}
                      subtitle={issue.fields.summary}
                      icon={issue.fields.issuetype.iconUrl}
                      accessories={[
                        { text: issue.fields.assignee?.displayName || "Unassigned" },
                        { text: issue.fields.priority?.name || "" },
                        ...(isMyIssue ? [{ icon: { source: Icon.Person, tintColor: Color.Blue } }] : []),
                      ]}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
                          <Action.CopyToClipboard content={issue.key} title="Copy Issue Key" />
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            ))}
        </>
      )}
    </List>
  );
}

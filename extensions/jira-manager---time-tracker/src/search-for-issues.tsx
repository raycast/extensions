import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  searchIssues,
  addComment,
  assignIssue,
  getMyself,
  getTransitions,
  transitionIssue,
  addWorklog,
  getProjects,
  createIssue,
  getProjectIssueTypes,
  searchUsers,
  getFavoriteFilters,
  addWatcher,
  removeWatcher,
} from "./utils/jira";
import { startIssue, getActiveIssue, pauseIssue } from "./utils/storage";
import { Preferences } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

function AddComment({ issueKey }: { issueKey: string }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { comment: string }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Adding comment..." });
      await addComment(issueKey, values.comment);
      showToast({ style: Toast.Style.Success, title: "Comment added" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to add comment", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Comment" />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={issueKey} />
      <Form.TextArea id="comment" title="Comment" placeholder="Write your comment here..." />
    </Form>
  );
}

function CreateSubtask({
  parentKey,
  projectId,
  onCreated,
}: {
  parentKey: string;
  projectId: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const { data: issueTypes, isLoading: isLoadingTypes } = usePromise(
    (id) => (id ? getProjectIssueTypes(id) : Promise.resolve([])),
    [projectId],
  );
  const { data: currentUser } = usePromise(getMyself);
  const [searchText, setSearchText] = useState("");
  const { data: users, isLoading: isLoadingUsers } = usePromise(searchUsers, [searchText]);

  async function handleSubmit(values: { summary: string; description: string; issuetype: string; assignee: string }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating subtask..." });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        fields: {
          parent: {
            key: parentKey,
          },
          summary: values.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: values.description || "",
                  },
                ],
              },
            ],
          },
          issuetype: {
            id: values.issuetype,
          },
          project: {
            id: projectId,
          },
        },
      };

      if (values.assignee) {
        body.fields.assignee = { id: values.assignee };
      }

      const issue = await createIssue(body);

      showToast({ style: Toast.Style.Success, title: "Subtask created", message: issue.key });
      onCreated();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create subtask", message: String(error) });
    }
  }

  const allUsers = users || [];
  if (currentUser && !allUsers.find((u) => u.accountId === currentUser.accountId)) {
    allUsers.unshift(currentUser);
  }

  const subtaskTypes = issueTypes?.filter((t) => t.subtask) || [];

  return (
    <Form
      isLoading={isLoadingTypes || isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Subtask" />
        </ActionPanel>
      }
    >
      <Form.Description title="Parent Issue" text={parentKey} />
      {subtaskTypes.length > 0 ? (
        <>
          <Form.Dropdown id="issuetype" title="Subtask Type">
            {subtaskTypes.map((type) => (
              <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} icon={type.iconUrl} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="assignee"
            title="Assignee"
            placeholder="Select assignee"
            defaultValue={currentUser?.accountId}
            onSearchTextChange={setSearchText}
            throttle
          >
            {allUsers.map((user) => (
              <Form.Dropdown.Item
                key={user.accountId}
                value={user.accountId}
                title={user.displayName}
                icon={Icon.Person}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField id="summary" title="Summary" placeholder="Subtask summary" />
          <Form.TextArea id="description" title="Description" placeholder="Subtask description" />
        </>
      ) : (
        <Form.Description
          title="Notice"
          text="No subtask types available for this project. Please check your Jira project configuration."
        />
      )}
    </Form>
  );
}

function ChangeStatus({ issueKey, onTransition }: { issueKey: string; onTransition: () => void }) {
  const { data: transitions, isLoading } = usePromise(getTransitions, [issueKey]);
  const { pop } = useNavigation();

  async function handleTransition(transitionId: string, transitionName: string) {
    try {
      showToast({ style: Toast.Style.Animated, title: `Transitioning to ${transitionName}...` });
      await transitionIssue(issueKey, transitionId);
      showToast({ style: Toast.Style.Success, title: "Status updated" });
      onTransition();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: String(error) });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Select New Status">
      {transitions?.map((t) => (
        <List.Item
          key={t.id}
          title={t.name}
          actions={
            <ActionPanel>
              <Action title={`Move to ${t.name}`} onAction={() => handleTransition(t.id, t.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState("filter:all-open");

  const getJql = () => {
    // Parse the filter value to determine if it's a project or filter type
    const isProjectFilter = filterValue.startsWith("project:");
    const selectedProject = isProjectFilter ? filterValue.replace("project:", "") : null;
    const filterType = isProjectFilter ? "all-open" : filterValue.replace("filter:", "");

    let baseJql = "";
    switch (filterType) {
      case "all-open":
        baseJql = "assignee = currentUser() AND created >= -30d ORDER BY created DESC";
        break;
      case "my-issues":
        baseJql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
        break;
      case "reported-by-me":
        baseJql = "reporter = currentUser() ORDER BY created DESC";
        break;
      case "done-recently":
        baseJql = "statusCategory = Done AND updated >= -7d ORDER BY updated DESC";
        break;
      case "backlog":
        baseJql = 'statusCategory in ("To Do") ORDER BY created DESC';
        break;
      default:
        baseJql = "assignee = currentUser() AND created >= -30d ORDER BY created DESC";
    }

    // Add project filter if a specific project is selected
    if (selectedProject && selectedProject !== "all") {
      const cleanBase = baseJql.split("ORDER BY")[0];
      const orderBy = baseJql.split("ORDER BY")[1] ? "ORDER BY" + baseJql.split("ORDER BY")[1] : "";
      baseJql = `(${cleanBase}) AND project = "${selectedProject}" ${orderBy}`;
    }

    if (searchText) {
      // When searching, expand the scope to search across all project issues
      // This allows finding backlog items and unassigned tasks
      const cleanBase = baseJql.split("ORDER BY")[0];
      const orderBy = baseJql.split("ORDER BY")[1] ? "ORDER BY" + baseJql.split("ORDER BY")[1] : "";

      // Search by issue key, summary (title), or description
      // Remove user-specific filters when searching to include backlog items
      const searchCondition = `(key = "${searchText}" OR summary ~ "${searchText}*" OR description ~ "${searchText}*")`;

      // If the filter is already broad (backlog, reported-by-me), keep it
      // Otherwise, expand to search all issues in the project
      if (filterType === "backlog" || filterType === "reported-by-me" || filterType === "done-recently") {
        return `(${cleanBase}) AND ${searchCondition} ${orderBy}`;
      } else {
        // For user-specific filters, when searching, include all issues but prioritize user's issues
        return `${searchCondition} ${orderBy}`;
      }
    }

    return baseJql;
  };

  const { data: issues, isLoading, revalidate } = usePromise(searchIssues, [getJql()]);
  const { data: currentUser } = usePromise(getMyself);
  const { data: projects } = usePromise(getProjects);
  const { data: favoriteFilters } = usePromise(getFavoriteFilters);

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  async function handleStartWork(issueKey: string, summary: string) {
    try {
      const activeIssue = await getActiveIssue();

      // Check if there's already a running issue
      if (activeIssue && activeIssue.isRunning && activeIssue.issueKey !== issueKey) {
        const elapsedSeconds = Math.floor((Date.now() - activeIssue.startTime) / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);

        // Warn if less than 1 minute of work
        if (elapsedSeconds < 60) {
          const confirmed = await confirmAlert({
            title: "Short Work Session",
            message: `You've only worked ${elapsedSeconds}s on ${activeIssue.issueKey}. This time won't be logged in Jira. Do you want to discard this time and start ${issueKey}?`,
            primaryAction: {
              title: "Discard & Start New",
              style: Alert.ActionStyle.Destructive,
            },
            dismissAction: {
              title: "Continue Current Task",
              style: Alert.ActionStyle.Cancel,
            },
            icon: Icon.Warning,
          });

          if (!confirmed) {
            return; // User chose to continue with current task
          }

          // Discard the current session without logging
          await pauseIssue(); // This removes it from storage
          showToast({
            style: Toast.Style.Success,
            title: "Time discarded",
            message: `${elapsedSeconds}s on ${activeIssue.issueKey} not logged`,
          });
        } else {
          // Normal flow: ask to pause and log
          const confirmed = await confirmAlert({
            title: "Issue Already Running",
            message: `${activeIssue.issueKey} is currently active (${elapsedMinutes}m worked). Do you want to pause it and start working on ${issueKey}?`,
            primaryAction: {
              title: "Pause & Start New",
              style: Alert.ActionStyle.Default,
            },
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
            icon: Icon.Clock,
          });

          if (!confirmed) {
            return; // User cancelled
          }

          // Pause the current issue and log the work
          showToast({ style: Toast.Style.Animated, title: "Pausing current issue..." });
          const paused = await pauseIssue();
          if (paused) {
            await addWorklog(
              paused.issueKey,
              paused.timeSpentSeconds,
              "Auto-logged when switching tasks",
              paused.started,
            );
            showToast({
              style: Toast.Style.Success,
              title: "Previous work logged",
              message: `${Math.floor(paused.timeSpentSeconds / 60)}m on ${paused.issueKey}`,
            });
          }
        }
      }

      await startIssue(issueKey, summary);
      showToast({ style: Toast.Style.Success, title: "Started working", message: issueKey });

      // Auto-transition to "In Progress" if possible
      // We need to fetch transitions first
      const transitions = await getTransitions(issueKey);
      const inProgressTransition = transitions.find(
        (t) =>
          t.name.toLowerCase() === "in progress" ||
          t.name.toLowerCase() === "en curso" ||
          t.to.name.toLowerCase() === "in progress",
      );

      if (inProgressTransition) {
        await transitionIssue(issueKey, inProgressTransition.id);
        showToast({ style: Toast.Style.Success, title: "Issue moved to In Progress" });
        revalidate(); // Refresh list to show new status
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to start work", message: String(error) });
    }
  }

  async function handleAssignToMe(issueKey: string) {
    if (!currentUser) return;
    try {
      showToast({ style: Toast.Style.Animated, title: "Assigning issue..." });
      await assignIssue(issueKey, currentUser.accountId);
      showToast({ style: Toast.Style.Success, title: "Issue assigned to you" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to assign issue", message: String(error) });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issues..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Issues" onChange={setFilterValue} value={filterValue} storeValue>
          <List.Dropdown.Section title="Favorites">
            {favoriteFilters?.map((filter: { id: string; name: string; jql: string }) => (
              <List.Dropdown.Item key={filter.id} title={filter.name} value={`filter:${filter.jql}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Projects">
            <List.Dropdown.Item title="All Projects" value="filter:all-open" />
            {projects?.map((project) => (
              <List.Dropdown.Item key={project.id} title={project.name} value={`project:${project.key}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Filter Type">
            <List.Dropdown.Item title="Recent Issues" value="filter:all-open" />
            <List.Dropdown.Item title="Assigned to Me" value="filter:my-issues" />
            <List.Dropdown.Item title="Reported by Me" value="filter:reported-by-me" />
            <List.Dropdown.Item title="Done Recently" value="filter:done-recently" />
            <List.Dropdown.Item title="Backlog" value="filter:backlog" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No issues found"
        description="Try adjusting your search terms or filters."
      />
      {issues?.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.key}
          subtitle={issue.fields.summary}
          icon={issue.fields.issuetype.iconUrl}
          accessories={[
            { text: issue.fields.status.name },
            { text: issue.fields.assignee?.displayName || "Unassigned" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
              <Action
                title="Start Work"
                icon="clock.png"
                onAction={() => handleStartWork(issue.key, issue.fields.summary)}
              />
              <Action.Push
                title="Change Status"
                icon={Icon.ArrowRight}
                target={<ChangeStatus issueKey={issue.key} onTransition={revalidate} />}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Assign to Me"
                icon={Icon.Person}
                onAction={() => handleAssignToMe(issue.key)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.Push
                title="Add Comment"
                icon={Icon.Bubble}
                target={<AddComment issueKey={issue.key} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.Push
                title="Create Subtask"
                icon={Icon.Plus}
                target={
                  <CreateSubtask parentKey={issue.key} projectId={issue.fields.project.id} onCreated={revalidate} />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
              <Action
                title={issue.fields.watches?.isWatching ? "Stop Watching" : "Start Watching"}
                icon={issue.fields.watches?.isWatching ? Icon.EyeSlash : Icon.Eye}
                onAction={async () => {
                  if (issue.fields.watches?.isWatching) {
                    await removeWatcher(issue.key, currentUser?.accountId || "");
                    showToast({ style: Toast.Style.Success, title: "Stopped watching issue" });
                  } else {
                    await addWatcher(issue.key);
                    showToast({ style: Toast.Style.Success, title: "Started watching issue" });
                  }
                  revalidate();
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              />
              <Action.CopyToClipboard content={issue.key} title="Copy Key" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

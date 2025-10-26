import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  open,
  getPreferenceValues,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { JiraAPI, JiraIssue, JiraTransition } from "./jira-api";

interface Project {
  id: string;
  key: string;
  name: string;
}

function ChangeStatusSubmenu({
  issue,
  onStatusChange,
}: {
  issue: JiraIssue;
  onStatusChange: (transitionId: string, transitionName: string) => void;
}) {
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTransitions() {
      try {
        const api = new JiraAPI();
        const transitionsData = await api.getTransitions(issue.key);
        setTransitions(transitionsData);
      } catch (error) {
        console.error("Failed to load transitions:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTransitions();
  }, [issue.key]);

  if (isLoading) {
    return (
      <ActionPanel.Submenu title="Change Status" icon={Icon.ArrowRight}>
        <Action title="Loading…" />
      </ActionPanel.Submenu>
    );
  }

  if (transitions.length === 0) {
    return (
      <ActionPanel.Submenu title="Change Status" icon={Icon.ArrowRight}>
        <Action title="No Transitions Available" />
      </ActionPanel.Submenu>
    );
  }

  return (
    <ActionPanel.Submenu title="Change Status" icon={Icon.ArrowRight} shortcut={{ modifiers: ["ctrl"], key: "t" }}>
      {transitions.map((transition) => (
        <Action
          key={transition.id}
          title={transition.name}
          icon={Icon.Circle}
          onAction={() => onStatusChange(transition.id, transition.to.name)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function AddCommentForm({ issue, onCommentAdded }: { issue: JiraIssue; onCommentAdded: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { comment: string }) {
    if (!values.comment.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Comment cannot be empty",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding comment...",
    });

    try {
      const api = new JiraAPI();
      await api.addComment(issue.key, values.comment);

      toast.style = Toast.Style.Success;
      toast.title = "Comment added";
      toast.message = `Comment added to ${issue.key}`;

      pop();
      onCommentAdded();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add comment";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Comment"
            icon={Icon.Message}
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Add a comment to ${issue.key}: ${issue.fields.summary}`} />
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Enter your comment..."
        autoFocus
        info="Your comment will be added to this issue in Jira"
      />
    </Form>
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const api = new JiraAPI();
        const projectsData = await api.getProjects();

        setProjects(projectsData);

        // Set default project from preferences, or fall back to first project
        const prefs = getPreferenceValues<{ defaultProject?: string }>();
        if (prefs.defaultProject && projectsData.some((p) => p.key === prefs.defaultProject)) {
          setSelectedProject(prefs.defaultProject);
        } else if (projectsData.length > 0) {
          setSelectedProject(projectsData[0].key);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  useEffect(() => {
    async function fetchProjectIssues() {
      if (!selectedProject) {
        setIssues([]);
        return;
      }

      setIsLoadingIssues(true);
      try {
        const api = new JiraAPI();
        const issuesData = await api.getProjectIssues(selectedProject);
        setIssues(issuesData);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load issues",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setIssues([]);
      } finally {
        setIsLoadingIssues(false);
      }
    }

    fetchProjectIssues();
  }, [selectedProject, refreshTrigger]);

  function handleRefresh() {
    setRefreshTrigger((prev) => prev + 1);
  }

  async function handleMarkAsDone(issue: JiraIssue) {
    const confirmed = await confirmAlert({
      title: "Mark as Done",
      message: `Are you sure you want to mark "${issue.fields.summary}" as done?`,
      primaryAction: {
        title: "Mark as Done",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Marking as done...",
    });

    try {
      const api = new JiraAPI();
      await api.markAsDone(issue.key);

      toast.style = Toast.Style.Success;
      toast.title = "Task marked as done";
      toast.message = `${issue.key} completed successfully`;

      // Refresh the list
      handleRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to mark as done";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleChangeStatus(issue: JiraIssue, transitionId: string, transitionName: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Changing status...",
    });

    try {
      const api = new JiraAPI();
      await api.transitionIssue(issue.key, transitionId);

      toast.style = Toast.Style.Success;
      toast.title = "Status changed";
      toast.message = `${issue.key} → ${transitionName}`;

      // Refresh the list
      handleRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to change status";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return "No due date";

    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for accurate comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return "Today";
    } else if (compareDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else if (compareDate < today) {
      const daysOverdue = Math.floor((today.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }

  function getStatusColor(statusName: string): Color {
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes("done") || lowerStatus.includes("complete")) {
      return Color.Green;
    } else if (lowerStatus.includes("progress") || lowerStatus.includes("doing")) {
      return Color.Blue;
    } else if (lowerStatus.includes("blocked") || lowerStatus.includes("hold")) {
      return Color.Red;
    }
    return Color.SecondaryText;
  }

  function getDueDateIcon(dateString?: string): { icon: Icon; tintColor: Color } {
    if (!dateString) {
      return { icon: Icon.Calendar, tintColor: Color.SecondaryText };
    }

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate < today) {
      return { icon: Icon.ExclamationMark, tintColor: Color.Red };
    } else if (compareDate.getTime() === today.getTime()) {
      return { icon: Icon.Clock, tintColor: Color.Orange };
    }

    return { icon: Icon.Calendar, tintColor: Color.SecondaryText };
  }

  const selectedProjectData = projects.find((p) => p.key === selectedProject);

  return (
    <List
      isLoading={isLoading || isLoadingIssues}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Project"
          value={selectedProject}
          onChange={setSelectedProject}
          isLoading={isLoading}
        >
          {projects.map((project) => (
            <List.Dropdown.Item key={project.id} value={project.key} title={`${project.name} (${project.key})`} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !selectedProject && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Project Selected"
          description="Use the dropdown above to select a project"
        />
      )}

      {!isLoading && issues.length === 0 && selectedProject && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No Outstanding Tasks"
          description={`All tasks in ${selectedProjectData?.name} are complete!`}
        />
      )}

      {issues.map((issue) => {
        const dueDateInfo = getDueDateIcon(issue.fields.duedate);
        return (
          <List.Item
            key={issue.id}
            icon={dueDateInfo.icon}
            title={issue.fields.summary}
            subtitle={issue.key}
            accessories={[
              {
                tag: {
                  value: issue.fields.status.name,
                  color: getStatusColor(issue.fields.status.name),
                },
              },
              {
                text: formatDate(issue.fields.duedate),
                icon: { source: Icon.Calendar, tintColor: dueDateInfo.tintColor },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Quick Actions">
                  <Action
                    title="Open in Jira"
                    icon={Icon.Globe}
                    onAction={() => {
                      const prefs = getPreferenceValues<{ jiraDomain: string }>();
                      open(`https://${prefs.jiraDomain}/browse/${issue.key}`);
                    }}
                  />
                  <Action
                    title="Mark as Done"
                    icon={Icon.CheckCircle}
                    style={Action.Style.Regular}
                    shortcut={{ modifiers: ["ctrl"], key: "d" }}
                    onAction={() => handleMarkAsDone(issue)}
                  />
                  <ChangeStatusSubmenu
                    issue={issue}
                    onStatusChange={(transitionId, transitionName) =>
                      handleChangeStatus(issue, transitionId, transitionName)
                    }
                  />
                  <Action.Push
                    title="Add Comment"
                    icon={Icon.Message}
                    shortcut={{ modifiers: ["ctrl"], key: "m" }}
                    target={<AddCommentForm issue={issue} onCommentAdded={handleRefresh} />}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
                    onAction={handleRefresh}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Issue Key"
                    content={issue.key}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Issue URL"
                    content={`https://${getPreferenceValues<{ jiraDomain: string }>().jiraDomain}/browse/${issue.key}`}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

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
} from "@raycast/api";
import { useState, useEffect } from "react";
import { JiraAPI, JiraIssue, JiraTransition } from "./jira-api";

interface Preferences {
  jiraDomain: string;
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

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  async function fetchIssues() {
    setIsLoading(true);
    try {
      const api = new JiraAPI();
      const issuesData = await api.getMyIssues();
      setIssues(issuesData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchIssues();
  }, []);

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
      await fetchIssues();
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
      await fetchIssues();
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

    // Reset time parts for accurate comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else if (date < today) {
      const daysOverdue = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`;
    } else {
      const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `In ${daysUntil} day${daysUntil > 1 ? "s" : ""}`;
    }
  }

  function getDateIcon(dateString?: string): { icon: Icon; tintColor?: Color } {
    if (!dateString) return { icon: Icon.Calendar };

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      return { icon: Icon.ExclamationMark, tintColor: Color.Red };
    } else if (date.getTime() === today.getTime()) {
      return { icon: Icon.Clock, tintColor: Color.Orange };
    } else {
      return { icon: Icon.Calendar, tintColor: Color.Green };
    }
  }

  function getPriorityIcon(priority?: { name: string }): { icon: Icon; tintColor?: Color } {
    if (!priority) return { icon: Icon.Minus };

    const priorityName = priority.name.toLowerCase();
    if (priorityName.includes("highest") || priorityName.includes("critical")) {
      return { icon: Icon.ArrowUp, tintColor: Color.Red };
    } else if (priorityName.includes("high")) {
      return { icon: Icon.ArrowUp, tintColor: Color.Orange };
    } else if (priorityName.includes("medium")) {
      return { icon: Icon.Minus, tintColor: Color.Yellow };
    } else if (priorityName.includes("low")) {
      return { icon: Icon.ArrowDown, tintColor: Color.Blue };
    } else if (priorityName.includes("lowest")) {
      return { icon: Icon.ArrowDown, tintColor: Color.SecondaryText };
    }
    return { icon: Icon.Minus };
  }

  function getStatusColor(status?: { statusCategory?: { colorName: string } }): Color {
    const colorName = status?.statusCategory?.colorName?.toLowerCase();
    switch (colorName) {
      case "green":
        return Color.Green;
      case "yellow":
        return Color.Yellow;
      case "blue":
        return Color.Blue;
      case "red":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks...">
      <List.EmptyView
        title="No Tasks Found"
        description="You don't have any assigned tasks or try adjusting your search"
        icon={Icon.CheckCircle}
      />

      {issues.map((issue) => {
        const dateInfo = getDateIcon(issue.fields.duedate);
        const priorityInfo = getPriorityIcon(issue.fields.priority);

        return (
          <List.Item
            key={issue.id}
            title={issue.fields.summary}
            subtitle={`${issue.key} • ${issue.fields.project.name}`}
            accessories={[
              {
                text: issue.fields.status.name,
                icon: { source: Icon.Circle, tintColor: getStatusColor(issue.fields.status) },
              },
              issue.fields.priority
                ? {
                    text: issue.fields.priority.name,
                    icon: priorityInfo,
                  }
                : {},
              {
                text: formatDate(issue.fields.duedate),
                icon: dateInfo,
              },
            ].filter((acc) => Object.keys(acc).length > 0)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Quick Actions">
                  <Action
                    title="Open in Jira"
                    icon={Icon.Globe}
                    onAction={() => {
                      open(`https://${preferences.jiraDomain}/browse/${issue.key}`);
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
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
                    onAction={fetchIssues}
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
                    content={`https://${preferences.jiraDomain}/browse/${issue.key}`}
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

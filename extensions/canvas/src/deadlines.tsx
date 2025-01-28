import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useDeadlines } from "./hooks/useDeadlines";

export default function DeadlinesCommand() {
  const { assignments, isLoading, error } = useDeadlines();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch deadlines", error.message);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search assignments...">
      {assignments.map((assignment) => (
        <List.Item
          key={assignment.id}
          title={assignment.title}
          subtitle={assignment.contextName}
          accessories={[{ tag: new Date(assignment.dueAt) }]}
          icon={getIcon(assignment)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={assignment.htmlUrl} />
              <Action.CopyToClipboard title="Copy Assignment Link" content={assignment.htmlUrl} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * Determine the icon based on due date.
 */
function getIcon(assignment: { dueAt: string }) {
  const dueDate = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const isDueSoon = dueDate && dueDate.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  if (isDueSoon) {
    return { source: Icon.Clock };
  }
  return { source: Icon.Document };
}

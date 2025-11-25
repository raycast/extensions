import {
  List,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  LaunchProps,
  Form,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchIssueById,
  getPreferences,
  RedmineIssue,
  createTimeEntry,
  fetchActivities,
  fetchIssueStatuses,
  updateIssueStatus,
  RedmineActivity,
  RedmineStatus,
} from "./redmine";

interface Arguments {
  ticketId: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const initialTicketId = props.arguments.ticketId || "";

  const [ticketId, setTicketId] = useState<string>(initialTicketId);
  const [issue, setIssue] = useState<RedmineIssue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshIssue() {
    if (!issue) return;
    try {
      const id = parseInt(ticketId.trim(), 10);
      if (!isNaN(id) && id > 0) {
        const issueData = await fetchIssueById(id);
        setIssue(issueData);
      }
    } catch (err) {
      console.error("Failed to refresh issue:", err);
    }
  }

  useEffect(() => {
    async function searchIssue() {
      const id = parseInt(ticketId.trim(), 10);

      if (!ticketId.trim()) {
        setIssue(null);
        setError(null);
        return;
      }

      if (isNaN(id) || id <= 0) {
        setError("Please enter a valid issue ID (positive number)");
        setIssue(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const issueData = await fetchIssueById(id);
        setIssue(issueData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch issue";
        setError(errorMessage);
        setIssue(null);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchIssue();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [ticketId]);

  function getStatusIcon(issue: RedmineIssue) {
    if (issue.status.is_closed) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Circle, tintColor: Color.Orange };
  }

  function getPriorityColor(priority: string): Color {
    const lowerPriority = priority.toLowerCase();
    if (lowerPriority.includes("high") || lowerPriority.includes("urgent")) {
      return Color.Red;
    }
    if (lowerPriority.includes("normal") || lowerPriority.includes("medium")) {
      return Color.Orange;
    }
    return Color.Blue;
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  function getIssueUrl(issueId: number): string {
    const prefs = getPreferences();
    const baseUrl = prefs.redmineUrl.replace(/\/$/, "");
    return `${baseUrl}/issues/${issueId}`;
  }

  if (error && !isLoading && ticketId.trim()) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Enter issue ID (e.g., 12345)"
        onSearchTextChange={setTicketId}
        searchText={ticketId}
      >
        <List.Item
          icon={Icon.ExclamationMark}
          title="Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action
                title="Clear"
                icon={Icon.XMarkCircle}
                onAction={() => {
                  setError(null);
                  setTicketId("");
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!issue && !isLoading && !error) {
    return (
      <List
        isLoading={false}
        searchBarPlaceholder="Enter issue ID (e.g., 12345)"
        onSearchTextChange={setTicketId}
        searchText={ticketId}
      >
        <List.Item icon={Icon.MagnifyingGlass} title="Search for Issue" subtitle="Enter an issue ID to view details" />
      </List>
    );
  }

  if (!issue) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Enter issue ID (e.g., 12345)"
        onSearchTextChange={setTicketId}
        searchText={ticketId}
      >
        <List.Item icon={Icon.Clock} title="Loading issue..." />
      </List>
    );
  }

  const statusIcon = getStatusIcon(issue);
  const priorityColor = getPriorityColor(issue.priority.name);
  const issueUrl = getIssueUrl(issue.id);

  const markdown = `# Issue #${issue.id}: ${issue.subject}

## Details

**Status:** ${issue.status.name} ${statusIcon.source === Icon.CheckCircle ? "✓" : "○"}
**Priority:** ${issue.priority.name}
**Project:** ${issue.project.name}
**Tracker:** ${issue.tracker.name}
${issue.assigned_to ? `**Assigned to:** ${issue.assigned_to.name}` : "**Assigned to:** Unassigned"}
**Created:** ${formatDate(issue.created_on)}
**Updated:** ${formatDate(issue.updated_on)}

${issue.description ? `## Description\n\n${issue.description}` : ""}
`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter issue ID (e.g., 12345)"
      onSearchTextChange={setTicketId}
      searchText={ticketId}
    >
      <List.Item
        icon={statusIcon}
        title={`#${issue.id}: ${issue.subject}`}
        subtitle={issue.project.name}
        accessories={[
          {
            text: issue.status.name,
            icon: statusIcon,
          },
          {
            text: issue.priority.name,
            icon: { source: Icon.Flag, tintColor: priorityColor },
          },
          {
            text: formatDate(issue.updated_on),
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Time Entry"
              icon={Icon.Clock}
              target={<AddTimeEntryForm issueId={issue.id} issueSubject={issue.subject} />}
            />
            <Action.Push
              title="Update Status"
              icon={Icon.ArrowRightCircle}
              target={<UpdateStatusForm issue={issue} onStatusUpdated={refreshIssue} />}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action.OpenInBrowser title="Open in Browser" url={issueUrl} icon={Icon.Globe} />
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={
                <Detail
                  markdown={markdown}
                  metadata={
                    <Detail.Metadata>
                      <Detail.Metadata.Label title="Issue ID" text={`#${issue.id}`} />
                      <Detail.Metadata.Label title="Status" text={issue.status.name} icon={statusIcon} />
                      <Detail.Metadata.Label title="Priority" text={issue.priority.name} />
                      <Detail.Metadata.Label title="Project" text={issue.project.name} />
                      <Detail.Metadata.Label title="Tracker" text={issue.tracker.name} />
                      {issue.assigned_to && <Detail.Metadata.Label title="Assigned To" text={issue.assigned_to.name} />}
                      <Detail.Metadata.Label title="Created" text={formatDate(issue.created_on)} />
                      <Detail.Metadata.Label title="Updated" text={formatDate(issue.updated_on)} />
                    </Detail.Metadata>
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Add Time Entry"
                        icon={Icon.Clock}
                        target={<AddTimeEntryForm issueId={issue.id} issueSubject={issue.subject} />}
                      />
                      <Action.Push
                        title="Update Status"
                        icon={Icon.ArrowRightCircle}
                        target={<UpdateStatusForm issue={issue} onStatusUpdated={refreshIssue} />}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                      <Action.OpenInBrowser title="Open in Browser" url={issueUrl} icon={Icon.Globe} />
                      <Action.CopyToClipboard title="Copy Issue URL" content={issueUrl} icon={Icon.Link} />
                      <Action.CopyToClipboard title="Copy Issue ID" content={issue.id.toString()} icon={Icon.Hashtag} />
                    </ActionPanel>
                  }
                />
              }
            />
            <Action.CopyToClipboard title="Copy Issue URL" content={issueUrl} icon={Icon.Link} />
            <Action.CopyToClipboard title="Copy Issue ID" content={issue.id.toString()} icon={Icon.Hashtag} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function UpdateStatusForm({ issue, onStatusUpdated }: { issue: RedmineIssue; onStatusUpdated: () => void }) {
  const [statuses, setStatuses] = useState<RedmineStatus[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>(issue.status.id.toString());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStatuses() {
      try {
        const statusesData = await fetchIssueStatuses(issue.id);
        setStatuses(statusesData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load statuses";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadStatuses();
  }, [issue.id]);

  async function handleSubmit() {
    const statusId = parseInt(selectedStatus, 10);
    if (statusId === issue.status.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No change",
        message: "Selected status is the same as current status",
      });
      return;
    }

    try {
      await updateIssueStatus(issue.id, statusId);

      await showToast({
        style: Toast.Style.Success,
        title: "Status updated",
        message: `Issue #${issue.id} status updated successfully`,
      });

      onStatusUpdated();
      popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Status" onSubmit={handleSubmit} icon={Icon.CheckCircle} />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`#${issue.id}: ${issue.subject}`} />
      <Form.Description title="Current Status" text={issue.status.name} />
      {statuses.length > 0 && (
        <Form.Dropdown
          id="status"
          title="New Status"
          value={selectedStatus}
          onChange={setSelectedStatus}
          info="Select the new status for this issue"
        >
          {statuses.map((status) => (
            <Form.Dropdown.Item key={status.id} title={status.name} value={status.id.toString()} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

function AddTimeEntryForm({ issueId, issueSubject }: { issueId: number; issueSubject: string }) {
  const [hours, setHours] = useState("");
  const [comments, setComments] = useState("");
  const [activities, setActivities] = useState<RedmineActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      try {
        const activitiesData = await fetchActivities();
        setActivities(activitiesData);
        if (activitiesData.length > 0) {
          // Set default to first activity (usually "Development" or "Design")
          setSelectedActivity(activitiesData[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to load activities:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivities();
  }, []);

  async function handleSubmit() {
    if (!hours || parseFloat(hours) <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid hours",
        message: "Please enter a valid number of hours",
      });
      return;
    }

    if (!selectedActivity) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Activity required",
        message: "Please select an activity",
      });
      return;
    }

    try {
      // Format date as YYYY-MM-DD for Redmine API
      const dateString = selectedDate.toISOString().split("T")[0];

      await createTimeEntry({
        issueId,
        hours: parseFloat(hours),
        comments: comments.trim() || undefined,
        activityId: parseInt(selectedActivity, 10),
        spentOn: dateString,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Time entry added",
        message: `${hours} hours logged for issue #${issueId}`,
      });

      popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add time entry";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Time Entry" onSubmit={handleSubmit} icon={Icon.Clock} />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`#${issueId}: ${issueSubject}`} />
      <Form.DatePicker
        id="date"
        title="Date"
        value={selectedDate}
        onChange={(date) => {
          if (date) {
            setSelectedDate(date);
          }
        }}
        info="Select the date for this time entry"
      />
      <Form.TextField
        id="hours"
        title="Hours"
        placeholder="e.g., 2.5"
        value={hours}
        onChange={setHours}
        info="Enter the number of hours worked"
      />
      {activities.length > 0 && (
        <Form.Dropdown id="activity" title="Activity" value={selectedActivity} onChange={setSelectedActivity}>
          {activities.map((activity) => (
            <Form.Dropdown.Item key={activity.id} title={activity.name} value={activity.id.toString()} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        id="comments"
        title="Comments"
        placeholder="Optional comments about the work done"
        value={comments}
        onChange={setComments}
      />
    </Form>
  );
}

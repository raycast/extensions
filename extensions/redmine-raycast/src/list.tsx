import { List, Icon, Color, showToast, Toast, ActionPanel, Action, Form, popToRoot, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchIssues,
  fetchProjects,
  createTimeEntry,
  fetchActivities,
  fetchIssueStatuses,
  updateIssueStatus,
  RedmineIssue,
  RedmineProject,
  IssueFilters,
  RedmineActivity,
  RedmineStatus,
  getPreferences,
} from "./redmine";

const ISSUES_PER_PAGE = 25;

export default function Command() {
  const [issues, setIssues] = useState<RedmineIssue[]>([]);
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  async function refreshIssues() {
    const filters: IssueFilters = {
      status: statusFilter,
      offset: 0,
      limit: ISSUES_PER_PAGE,
    };
    if (projectFilter !== "all") {
      const projectId = parseInt(projectFilter, 10);
      if (!isNaN(projectId)) {
        filters.projectId = projectId;
      }
    }
    const result = await fetchIssues(filters);
    setIssues(result.issues);
    setTotalCount(result.totalCount);
    setHasMore(result.hasMore);
    setCurrentOffset(result.offset + result.issues.length);
  }

  useEffect(() => {
    async function loadProjects() {
      try {
        const projectsData = await fetchProjects();
        setProjects(projectsData);
      } catch (err) {
        // Don't show error for projects, just log it
        console.error("Failed to load projects:", err);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    async function loadIssues() {
      setIsLoading(true);
      setError(null);
      setCurrentOffset(0);

      try {
        const filters: IssueFilters = {
          status: statusFilter,
          offset: 0,
          limit: ISSUES_PER_PAGE,
        };

        if (projectFilter !== "all") {
          const projectId = parseInt(projectFilter, 10);
          if (!isNaN(projectId)) {
            filters.projectId = projectId;
          }
        }

        const result = await fetchIssues(filters);
        setIssues(result.issues);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setCurrentOffset(result.offset + result.issues.length);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load issues";
        setError(errorMessage);
        setIssues([]);
        setTotalCount(0);
        setHasMore(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadIssues();
  }, [statusFilter, projectFilter]);

  async function loadMoreIssues() {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const filters: IssueFilters = {
        status: statusFilter,
        offset: currentOffset,
        limit: ISSUES_PER_PAGE,
      };

      if (projectFilter !== "all") {
        const projectId = parseInt(projectFilter, 10);
        if (!isNaN(projectId)) {
          filters.projectId = projectId;
        }
      }

      const result = await fetchIssues(filters);
      setIssues((prevIssues) => [...prevIssues, ...result.issues]);
      setHasMore(result.hasMore);
      setCurrentOffset(result.offset + result.issues.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load more issues";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoadingMore(false);
    }
  }

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

  if (error && !isLoading) {
    return (
      <List>
        <List.Item icon={Icon.ExclamationMark} title="Error loading issues" subtitle={error} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Project" value={projectFilter} onChange={setProjectFilter}>
          <List.Dropdown.Item title="All Projects" value="all" />
          {projects.map((project) => (
            <List.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Filters">
        <List.Item
          icon={Icon.Filter}
          title={`Status: ${statusFilter === "all" ? "All" : statusFilter === "open" ? "Open" : "Closed"}`}
          accessories={[
            {
              text: statusFilter === "all" ? "All" : statusFilter === "open" ? "Open" : "Closed",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Show All Issues" onAction={() => setStatusFilter("all")} icon={Icon.List} />
              <Action title="Show Open Issues" onAction={() => setStatusFilter("open")} icon={Icon.Circle} />
              <Action title="Show Closed Issues" onAction={() => setStatusFilter("closed")} icon={Icon.CheckCircle} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section
        title={`Issues (${totalCount > 0 ? `${issues.length} of ${totalCount}` : issues.length})`}
        subtitle={statusFilter === "all" ? "All statuses" : statusFilter === "open" ? "Open issues" : "Closed issues"}
      >
        {issues.length === 0 && !isLoading ? (
          <List.Item icon={Icon.Info} title="No issues found" subtitle="Try adjusting your filters" />
        ) : (
          <>
            {issues.map((issue) => (
              <List.Item
                key={issue.id}
                icon={getStatusIcon(issue)}
                title={`#${issue.id}: ${issue.subject}`}
                subtitle={issue.project.name}
                accessories={[
                  {
                    text: issue.status.name,
                    icon: getStatusIcon(issue),
                  },
                  {
                    text: issue.priority.name,
                    icon: { source: Icon.Flag, tintColor: getPriorityColor(issue.priority.name) },
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
                      target={<UpdateStatusForm issue={issue} onStatusUpdated={refreshIssues} />}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                    <Action.OpenInBrowser title="Open in Browser" url={getIssueUrl(issue.id)} icon={Icon.Globe} />
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={
                        <IssueDetailView
                          issue={issue}
                          getStatusIcon={getStatusIcon}
                          formatDate={formatDate}
                          getIssueUrl={getIssueUrl}
                        />
                      }
                    />
                    <Action.CopyToClipboard title="Copy Issue URL" content={getIssueUrl(issue.id)} icon={Icon.Link} />
                    <Action.CopyToClipboard title="Copy Issue ID" content={issue.id.toString()} icon={Icon.Hashtag} />
                  </ActionPanel>
                }
              />
            ))}
            {hasMore && (
              <List.Item
                icon={isLoadingMore ? Icon.Clock : Icon.ArrowDown}
                title={isLoadingMore ? "Loading more issues..." : "Load More Issues"}
                subtitle={`Load ${ISSUES_PER_PAGE} more issues (${totalCount - issues.length} remaining)`}
                actions={
                  <ActionPanel>
                    <Action title="Load More Issues" onAction={loadMoreIssues} icon={Icon.ArrowDown} />
                  </ActionPanel>
                }
              />
            )}
          </>
        )}
      </List.Section>
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

function IssueDetailView({
  issue,
  getStatusIcon,
  formatDate,
  getIssueUrl,
}: {
  issue: RedmineIssue;
  getStatusIcon: (issue: RedmineIssue) => { source: Icon; tintColor: Color };
  formatDate: (dateString: string) => string;
  getIssueUrl: (issueId: number) => string;
}) {
  const statusIcon = getStatusIcon(issue);
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
            target={
              <UpdateStatusForm
                issue={issue}
                onStatusUpdated={async () => {
                  // This will be handled by the parent component refresh
                }}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.OpenInBrowser title="Open in Browser" url={issueUrl} icon={Icon.Globe} />
          <Action.CopyToClipboard title="Copy Issue URL" content={issueUrl} icon={Icon.Link} />
          <Action.CopyToClipboard title="Copy Issue ID" content={issue.id.toString()} icon={Icon.Hashtag} />
        </ActionPanel>
      }
    />
  );
}

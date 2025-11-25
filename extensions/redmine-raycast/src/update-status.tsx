import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchIssueById, fetchIssueStatuses, updateIssueStatus, RedmineIssue, RedmineStatus } from "./redmine";

interface Arguments {
  issueId: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const initialIssueId = props.arguments.issueId || "";

  const [issueId, setIssueId] = useState<string>(initialIssueId);
  const [issue, setIssue] = useState<RedmineIssue | null>(null);
  const [statuses, setStatuses] = useState<RedmineStatus[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIssue() {
      const id = parseInt(issueId.trim(), 10);

      if (!issueId.trim()) {
        setIssue(null);
        setStatuses([]);
        setSelectedStatus("");
        setError(null);
        return;
      }

      if (isNaN(id) || id <= 0) {
        setError("Please enter a valid issue ID (positive number)");
        setIssue(null);
        setStatuses([]);
        setSelectedStatus("");
        return;
      }

      setIsLoading(true);
      setIsLoadingStatuses(true);
      setError(null);

      try {
        const issueData = await fetchIssueById(id);
        setIssue(issueData);

        // Fetch available statuses for this issue
        const statusesData = await fetchIssueStatuses(id);
        setStatuses(statusesData);

        // Set current status as selected
        setSelectedStatus(issueData.status.id.toString());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch issue";
        setError(errorMessage);
        setIssue(null);
        setStatuses([]);
        setSelectedStatus("");
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
        setIsLoadingStatuses(false);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadIssue();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [issueId]);

  async function handleSubmit() {
    if (!issue) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Issue required",
        message: "Please enter a valid issue ID",
      });
      return;
    }

    if (!selectedStatus) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Status required",
        message: "Please select a status",
      });
      return;
    }

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

      // Refresh issue data
      const updatedIssue = await fetchIssueById(issue.id);
      setIssue(updatedIssue);
      setSelectedStatus(updatedIssue.status.id.toString());

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
      isLoading={isLoading || isLoadingStatuses}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Status" onSubmit={handleSubmit} icon={Icon.CheckCircle} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Update Issue Status"
        text="Enter an issue ID to load its current status and available status options."
      />

      <Form.TextField
        id="issueId"
        title="Issue ID"
        placeholder="Enter issue ID (e.g., 12345)"
        value={issueId}
        onChange={setIssueId}
        info="Enter the ID of the issue you want to update"
      />

      {error && issueId.trim() && <Form.Description title="Error" text={error} />}

      {issue && (
        <>
          <Form.Description title="Issue" text={`#${issue.id}: ${issue.subject}`} />
          <Form.Description title="Current Status" text={issue.status.name} />
        </>
      )}

      {statuses.length > 0 && (
        <Form.Dropdown
          id="status"
          title="New Status"
          value={selectedStatus}
          onChange={setSelectedStatus}
          info="Select the new status for this issue"
          isLoading={isLoadingStatuses}
        >
          {statuses.map((status) => (
            <Form.Dropdown.Item key={status.id} title={status.name} value={status.id.toString()} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

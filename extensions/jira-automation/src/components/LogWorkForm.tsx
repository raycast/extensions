import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { logWorkAcrossIssues, fetchWorklogsReport } from "../api/jira-client";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";

import { JiraIssue } from "../api/jira-client";

interface Props {
  issueKeys?: string[];
  availableIssues?: JiraIssue[];
  initialDate?: Date;
  onDone: () => void;
}

export default function LogWorkForm({ issueKeys = [], availableIssues = [], initialDate, onDone }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const { data: worklogs, isLoading: isLoadingWorklogs } = useCachedPromise(fetchWorklogsReport, [
    formattedDate,
    formattedDate,
  ]);

  const totalLoggedSeconds = worklogs?.reduce((acc, wl) => acc + wl.timeSpentSeconds, 0) || 0;
  const totalLoggedHours = (totalLoggedSeconds / 3600).toFixed(1);

  // Create a default date and time (9:30 AM)
  const defaultDateTime = initialDate ? new Date(initialDate) : new Date();
  defaultDateTime.setHours(9, 30, 0, 0);

  const handleSubmit = async (values: { timeSpent: string; comment: string; date: Date; issueKey?: string }) => {
    if (!values.timeSpent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Time spent is required",
      });
      return;
    }

    const keys = issueKeys.length > 0 ? issueKeys : values.issueKey ? [values.issueKey] : [];
    if (keys.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Issue is required",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Logging work...",
    });

    try {
      const started = values.date.toISOString().replace("Z", "+0000"); // Jira expects this format
      const results = await logWorkAcrossIssues(keys, values.timeSpent, values.comment, started);
      const failures = results.filter((r) => !r.success);

      if (failures.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = `Logged work for ${keys.length} ticket(s)`;
        onDone();
        pop();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to log work for some tickets";
        toast.message = failures.map((f) => `${f.key}: ${f.error}`).join("\n");
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || isLoadingWorklogs}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Work" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {issueKeys.length > 0 ? (
        <Form.Description text={`Logging work for: ${issueKeys.join(", ")}`} />
      ) : (
        <Form.Dropdown id="issueKey" title="Select Issue">
          {availableIssues.map((issue) => (
            <Form.Dropdown.Item key={issue.key} value={issue.key} title={`${issue.key}: ${issue.fields.summary}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.DatePicker
        id="date"
        title="Date"
        defaultValue={defaultDateTime}
        onChange={(newValue) => {
          if (newValue) setSelectedDate(newValue);
        }}
      />
      <Form.Description
        title="Logged Hours"
        text={`${totalLoggedHours}h total logged for ${format(selectedDate, "MMM d, yyyy")}`}
      />
      <Form.TextField id="timeSpent" title="Time Spent" placeholder="e.g., 1h 30m, 2d" autoFocus />
      <Form.TextArea id="comment" title="Comment (Optional)" placeholder="What did you work on?" />
    </Form>
  );
}

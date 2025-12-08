import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { addWorklog, searchIssues } from "./utils/jira";
import { useState } from "react";

export default function Command() {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const { data: issues, isLoading } = usePromise(searchIssues, [
    searchText
      ? `text ~ "${searchText}*" AND assignee = currentUser()`
      : "assignee = currentUser() AND updated >= -30d ORDER BY updated DESC",
  ]);

  async function handleSubmit(values: { issue: string; timeSpent: string; comment: string; started: Date }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Logging work..." });

      // ... (existing parsing logic) ...
      let seconds = 0;
      const hoursMatch = values.timeSpent.match(/(\d+)h/);
      const minutesMatch = values.timeSpent.match(/(\d+)m/);

      if (hoursMatch) seconds += parseInt(hoursMatch[1]) * 3600;
      if (minutesMatch) seconds += parseInt(minutesMatch[1]) * 60;

      if (seconds === 0 && !values.timeSpent.includes("h") && !values.timeSpent.includes("m")) {
        // Fallback: assume minutes if just a number
        const val = parseInt(values.timeSpent);
        if (!isNaN(val)) seconds = val * 60;
      }

      if (seconds === 0) {
        throw new Error("Invalid time format. Use '1h 30m' or just minutes.");
      }

      await addWorklog(values.issue, seconds, values.comment, values.started);
      showToast({ style: Toast.Style.Success, title: "Work logged" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to log work", message: String(error) });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="issue" title="Issue" onSearchTextChange={setSearchText} throttle>
        {issues?.map((issue) => (
          <Form.Dropdown.Item
            key={issue.id}
            value={issue.key}
            title={`${issue.key} - ${issue.fields.summary}`}
            icon={issue.fields.issuetype.iconUrl}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="started"
        title="Date & Time"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={new Date()}
      />
      <Form.TextField id="timeSpent" title="Time Spent" placeholder="e.g. 1h 30m, or 15 (for minutes)" />
      <Form.TextArea id="comment" title="Comment" placeholder="Work description" />
    </Form>
  );
}

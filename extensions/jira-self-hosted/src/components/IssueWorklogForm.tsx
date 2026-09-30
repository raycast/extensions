import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import { useState } from "react";

import { addWorklog, Issue, IssueDetail } from "../api/issues";
import { getErrorMessage } from "../helpers/errors";
import { formatJiraStarted, parseJiraTimeSpentToSeconds } from "../helpers/worklog";

type IssueWorklogFormProps = {
  issue: Issue | IssueDetail;
  mutate?: MutatePromise<Issue[] | undefined>;
  mutateDetail?: MutatePromise<Issue | IssueDetail | null>;
};

export default function IssueWorklogForm({ issue, mutate, mutateDetail }: IssueWorklogFormProps) {
  const { pop } = useNavigation();
  const [started, setStarted] = useState<Date | null>(new Date());
  const [timeSpent, setTimeSpent] = useState("");
  const [description, setDescription] = useState("");

  async function submit() {
    const startedDate = started ?? new Date();
    const timeSpentSeconds = parseJiraTimeSpentToSeconds(timeSpent);
    if (timeSpentSeconds == null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid time",
        message: "Use a duration like 2h 15m 30s",
      });
      return false;
    }

    const trimmed = description.trim();
    await showToast({ style: Toast.Style.Animated, title: "Logging work" });

    try {
      await addWorklog(issue.key, {
        started: formatJiraStarted(startedDate),
        timeSpentSeconds,
        comment: trimmed || undefined,
      });

      await showToast({ style: Toast.Style.Success, title: "Work logged" });
      pop();

      if (mutate) {
        mutate();
      }
      if (mutateDetail) {
        mutateDetail();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to log work",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Work" onSubmit={submit} icon={Icon.Clock} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="started"
        title="Date"
        type={Form.DatePicker.Type.DateTime}
        value={started}
        onChange={setStarted}
      />
      <Form.TextField
        id="timeSpent"
        title="Time (e.g. 2h 15m 30s)"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeSpent}
        onChange={setTimeSpent}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Description of work completed…"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

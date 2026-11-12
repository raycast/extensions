import { Form } from "@raycast/api";
import { useEffect, useState } from "react";
import { JiraIssue } from "../../../utils/jira";
import { ticketTimeText, TicketTimeSummary } from "../../../utils/ticket-time";
import { fetchJiraTicketTime } from "../jira-time-api";

export function JiraTicketTime({ issue, refresh }: { issue: JiraIssue; refresh: number }) {
  const [state, setState] = useState<{ summary?: TicketTimeSummary; failed?: boolean }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    void fetchJiraTicketTime(issue, controller.signal)
      .then((summary) => {
        if (!controller.signal.aborted) setState({ summary });
      })
      .catch(() => {
        // Do not display or log raw Axios errors, request credentials, or customer data.
        if (!controller.signal.aborted) setState({ failed: true });
      });
    return () => controller.abort();
  }, [issue.url, issue.key, refresh]);
  const text = state.failed
    ? "Unavailable · ⌘R to retry"
    : state.summary
      ? ticketTimeText(state.summary)
      : "Checking booked time…";
  return (
    <>
      <Form.Description title="Your time" text={text} />
      {state.summary?.running ? <Form.Description title="Timer" text="Running on this ticket · ⌘R to refresh" /> : null}
    </>
  );
}

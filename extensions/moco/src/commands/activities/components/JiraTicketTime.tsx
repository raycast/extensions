import { Form } from "@raycast/api";
import { ticketTimeText, TicketTimeSummary } from "../../../utils/ticket-time";

export function JiraTicketTime({
  summary,
  isLoading,
  failed,
}: {
  summary?: TicketTimeSummary;
  isLoading: boolean;
  failed: boolean;
}) {
  const text = isLoading
    ? "Checking booked time…"
    : failed
      ? "Unavailable · ⌘R to retry"
      : summary
        ? ticketTimeText(summary)
        : "Checking booked time…";
  return (
    <>
      <Form.Description title="Your time" text={text} />
      {!isLoading && !failed && summary?.running ? (
        <Form.Description title="Timer" text="Running on this ticket · ⌘R to refresh" />
      ) : null}
    </>
  );
}

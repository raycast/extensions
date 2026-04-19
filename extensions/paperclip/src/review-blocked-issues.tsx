import { PaperclipIssuesList } from "./issues-list";

export default function ReviewBlockedIssuesCommand() {
  return <PaperclipIssuesList defaultStatusFilter="review_or_blocked" navigationTitle="Review or Blocked Issues" />;
}

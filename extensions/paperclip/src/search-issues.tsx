import { PaperclipIssuesList } from "./issues-list";

export default function SearchIssuesCommand() {
  return <PaperclipIssuesList defaultStatusFilter="all" navigationTitle="Paperclip Issues" />;
}

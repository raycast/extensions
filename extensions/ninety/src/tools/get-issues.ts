import { queryIssues } from "../api/ninety";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. */
  teamId: string;
  /** Optional: only one list. */
  interval?: "SHORT_TERM" | "LONG_TERM";
  /** Optional text to search for. */
  searchText?: string;
};

export default async function tool({ teamId, interval, searchText }: Input) {
  const issues = await queryIssues({ teamId, intervalCode: interval, searchText });
  return issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    list: issue.intervalCode === "LONG_TERM" ? "Long-Term" : "Short-Term",
    priority: issue.priority || undefined,
    createdDate: issue.createdDate,
    ownerUserId: issue.userId,
    url: NinetyUrls.issue(issue),
  }));
}

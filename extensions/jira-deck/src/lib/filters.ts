import { Issue } from "./issue";
import { priorityLevel, PriorityLevel } from "./priority";

/** "all", "me", "unassigned" or an account ID. */
export type PeopleFilter = string;

export interface Filters {
  people: PeopleFilter;
  priority?: PriorityLevel;
}

export function applyFilters(issues: Issue[], filters: Filters, myAccountId: string): Issue[] {
  return issues.filter((issue) => {
    if (filters.priority && priorityLevel(issue.priority) !== filters.priority) return false;
    switch (filters.people) {
      case "all":
        return true;
      case "me":
        return issue.assignee?.accountId === myAccountId;
      case "unassigned":
        return !issue.assignee;
      default:
        return issue.assignee?.accountId === filters.people;
    }
  });
}

/** "12 issues · 4 completed". Says "loaded" when the list may be missing issues. */
export function summarize(issues: Issue[], complete: boolean): string {
  const done = issues.filter((issue) => issue.status.category === "done").length;
  const count = `${issues.length} ${issues.length === 1 ? "issue" : "issues"}${complete ? "" : " loaded"}`;
  return `${count} · ${done} completed`;
}

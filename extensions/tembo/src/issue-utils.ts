import { environment, Icon } from "@raycast/api";
import type { Issue } from "./api";

export type IssueStatus = "queued" | "open" | "closed" | "merged" | "failed";
export type IntegrationType =
  | "github"
  | "postgres"
  | "sentry"
  | "linear"
  | "jira"
  | "supabase"
  | "other";

export function getIssueStatus(issue: Issue): IssueStatus {
  if (issue.solutions.length > 0) {
    const latestSolution = issue.solutions[issue.solutions.length - 1];
    if (latestSolution.status === "Success") {
      if (latestSolution.pullRequest.length > 0) {
        const prStatus = latestSolution.pullRequest[0].status;
        return prStatus === "merged"
          ? "merged"
          : prStatus === "closed"
            ? "closed"
            : "open";
      } else {
        return "open";
      }
    } else if (latestSolution.status === "Failed") {
      return "failed";
    } else {
      return "queued";
    }
  }
  return "queued";
}

export function getIssueIntegrationType(issue: Issue): IntegrationType {
  const integrationType =
    (issue.issueSource.integration?.type as IntegrationType) ||
    (issue.issueSource.type as IntegrationType) ||
    "other";
  return integrationType;
}

export function getIssueRepo(issue: Issue): string {
  return issue.issueSource.name;
}

export function getIssueSolutionsCount(issue: Issue): number {
  return issue.solutions.length;
}

export function getStatusIcon(status: IssueStatus) {
  switch (status) {
    case "queued":
      return { source: "git-queued.png" };
    case "open":
      return { source: "git-pr-open.png" };
    case "closed":
      return { source: "git-pr-closed.png" };
    case "merged":
      return { source: "git-pr-merged.png" };
    case "failed":
      return { source: "failed.png" };
    default:
      return { source: "git-pr-closed.png" };
  }
}

export function getIntegrationIcon(integrationType: IntegrationType) {
  const isDarkMode = environment.appearance === "dark";

  switch (integrationType) {
    case "github":
      return { source: isDarkMode ? "github-inverted.png" : "github.png" };
    case "linear":
      return { source: isDarkMode ? "linear-inverted.png" : "linear.png" };
    case "postgres":
      return { source: "postgres.png" };
    case "sentry":
      return { source: "sentry.png" };
    case "jira":
      return { source: "jira.png" };
    case "supabase":
      return { source: "supabase.png" };
    default:
      return Icon.Person;
  }
}

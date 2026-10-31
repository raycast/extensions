import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getMyself } from "./jira-data";
import { Board } from "./issue";
import { jira, JiraError, myIssuesJql, SetupError, siteOrigin } from "./jira";
import { sourceKey } from "./source";

// The steps Test Connection runs, in order. Each one needs the one before it to pass.

export type CheckStatus = "waiting" | "running" | "passed" | "warning" | "failed" | "skipped";

/** Works, but something optional is off. The next steps still run. */
export class CheckWarning extends Error {}

export interface CheckResult {
  status: CheckStatus;
  /** What was found, or why it failed. */
  detail?: string;
  /** Set when the fix is in the extension's preferences. */
  setup?: boolean;
}

export interface Check {
  id: "site" | "account" | "issues" | "boards" | "columns";
  title: string;
  run: () => Promise<string>;
}

export const CHECKS: Check[] = [
  {
    id: "site",
    title: "Jira Site",
    async run() {
      const origin = siteOrigin();
      const { email, apiToken } = getPreferenceValues<Preferences>();
      if (!origin) throw new SetupError("Add your Jira site, like your-team.atlassian.net.");
      if (!email?.trim() || !apiToken?.trim()) throw new SetupError("Add your email and API token.");
      return new URL(origin).host;
    },
  },
  {
    id: "account",
    title: "Email and API Token",
    async run() {
      const me = await getMyself();
      return `Signed in as ${me.displayName}`;
    },
  },
  {
    id: "issues",
    title: "Your Issues",
    async run() {
      // The same search as My Issues, so an empty list there can be told apart from a filter.
      const page = await jira<{ issues: unknown[]; nextPageToken?: string }>("/rest/api/3/search/jql", {
        method: "POST",
        body: { jql: myIssuesJql((await getMyself()).accountId), fields: ["summary"], maxResults: 50 },
      });
      if (!page.issues.length) return "No open issues are assigned to you";
      const count = `${page.issues.length}${page.nextPageToken ? "+" : ""}`;
      return `${count} open ${page.issues.length === 1 ? "issue" : "issues"} assigned to you`;
    },
  },
  {
    id: "boards",
    title: "Boards",
    async run() {
      try {
        const page = await jira<{ total?: number }>("/rest/agile/1.0/board", { query: { maxResults: 1 } });
        const total = page.total ?? 0;
        if (total === 0) return "No boards yet. Board and Backlog need one.";
        return `${total} ${total === 1 ? "board" : "boards"} you can see`;
      } catch (error) {
        // Sites without Jira Software have no Agile API.
        if (error instanceof JiraError && (error.status === 403 || error.status === 404)) {
          throw new JiraError("Boards need Jira Software. My Issues and Create Issue still work.", error.status);
        }
        throw error;
      }
    },
  },
  {
    id: "columns",
    title: "Board Columns",
    async run() {
      const board = (await pinnedBoards())[0];
      if (!board) return "Pin a board to check it.";
      try {
        const config = await jira<{ columnConfig?: { columns?: unknown[] } }>(
          `/rest/agile/1.0/board/${encodeURIComponent(board.id)}/configuration`,
        );
        const count = config.columnConfig?.columns?.length ?? 0;
        return `${board.name}: ${count} ${count === 1 ? "column" : "columns"}`;
      } catch (error) {
        if (error instanceof SetupError || (error instanceof JiraError && (error.status ?? 0) < 500)) {
          throw new CheckWarning("Grouped by status. Add read:board-scope.admin:jira-software to see columns.");
        }
        throw error;
      }
    },
  },
];

async function pinnedBoards(): Promise<Board[]> {
  try {
    return JSON.parse((await LocalStorage.getItem<string>(`pinned-boards:${sourceKey()}`)) ?? "[]");
  } catch {
    return [];
  }
}

export function toResult(error: unknown): CheckResult {
  return {
    status: error instanceof CheckWarning ? "warning" : "failed",
    detail: error instanceof Error ? error.message : String(error),
    setup: error instanceof SetupError,
  };
}

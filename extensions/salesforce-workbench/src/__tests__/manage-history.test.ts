import { describe, expect, it } from "vitest";
import { historyMarkdown } from "../manage-history";
import { QueryHistoryEntry } from "../types";

describe("history detail", () => {
  it("summarizes query history without rendering the entire snapshot", () => {
    const entry: QueryHistoryEntry = {
      id: "history-1",
      kind: "query",
      mode: "soql",
      timestamp: "2026-07-10T12:00:00.000Z",
      orgId: "org-example",
      orgAlias: "Example Sandbox",
      text: "SELECT Id FROM Account",
      rowCount: 8,
      records: Array.from({ length: 8 }, (_, index) => ({ Id: `001${index}`, Name: `Account ${index}` })),
      resultTruncated: false,
    };

    const markdown = historyMarkdown(entry);

    expect(markdown).toContain("SELECT Id FROM Account");
    expect(markdown).toContain("first 5 saved rows");
    expect(markdown).toContain("Account 4");
    expect(markdown).not.toContain("Account 5");
    expect(markdown).toContain("Copy History JSON");
  });
});

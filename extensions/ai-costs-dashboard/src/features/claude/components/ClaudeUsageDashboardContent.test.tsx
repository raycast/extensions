import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ClaudeUsageDashboardContent", () => {
  it("omits the billing section when Claude has no active billing block", () => {
    const source = readFileSync(
      join(__dirname, "ClaudeUsageDashboardContent.tsx"),
      "utf8",
    );

    expect(source).toContain("query.data?.currentBlock &&");
  });
});

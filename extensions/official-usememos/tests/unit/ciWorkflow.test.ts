import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("CI workflow", () => {
  it("cancels in-progress runs on pull requests only", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    expect(workflow).toMatch(
      /cancel-in-progress:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}/,
    );
  });
});

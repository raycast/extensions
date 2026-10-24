import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHANGELOG = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
const HEADINGS = CHANGELOG.split("\n").filter((line) => line.startsWith("## "));

describe("changelog", () => {
  it("has exactly one unreleased placeholder", () => {
    // Raycast substitutes {PR_MERGE_DATE} on merge. Two placeholders would
    // resolve to the same date and read as two releases shipping at once.
    const count = CHANGELOG.split("{PR_MERGE_DATE}").length - 1;
    expect(count).toBe(1);
  });

  it("gives every entry a bracketed title", () => {
    for (const heading of HEADINGS) {
      expect(heading).toMatch(/^## \[[^\]]+\]/);
    }
  });

  it("dates releases only where the date is known and verifiable", () => {
    // v1.0.0's date is not in this repository: its history begins at
    // "Prepare v1.1" and there are no tags or releases. It came from the
    // merge of raycast/extensions#25901 on 2026-03-12. Pinned here so it is
    // not "cleaned up" as unverifiable again.
    expect(CHANGELOG).toContain("## [Initial Version] - 2026-03-12");

    // Any other dated heading must be ISO, never invented prose.
    const dated = HEADINGS.filter((h) => /- \d/.test(h));
    for (const heading of dated) {
      expect(heading).toMatch(/- \d{4}-\d{2}-\d{2}$/);
    }
  });

  it("uses no em-dash", () => {
    // Written as an escape, not the literal glyph, so this file does not
    // trip the em-dash detector in copy.test.ts.
    expect(CHANGELOG).not.toContain("\u2014");
  });
});

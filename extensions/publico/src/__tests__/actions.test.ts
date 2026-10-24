import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ITEM = join(ROOT, "src", "components", "ArticleListItem.tsx");
const source = () => readFileSync(ITEM, "utf8");

// Actions removed 2026-08-06 because the API never returns article text and
// the public article page is WAF-challenged. See context.md backlog item 3
// before reinstating any of them.
const REMOVED = ["Read Article", "View Summary", "Summarize", "Copy Summary"];

describe("action panel", () => {
  it("ships no action that cannot do what it promises", () => {
    const present = REMOVED.filter((title) =>
      source().includes(`title="${title}"`),
    );
    expect(present).toEqual([]);
  });

  it("keeps the actions that work", () => {
    const text = source();
    for (const title of [
      "Open in Browser",
      "Copy URL",
      "Copy Title",
      "Refresh",
    ]) {
      expect(text).toContain(`title="${title}"`);
    }
  });

  it("opens the browser on Enter", () => {
    // The first action in the panel is what Enter triggers. Read Article used
    // to hold that slot and could not render an article.
    const text = source();
    const first = text.indexOf("<Action", text.indexOf("<ActionPanel>"));
    expect(text.slice(first, first + 220)).toContain("OpenInBrowser");
  });

  it("has no orphaned reader component", () => {
    expect(existsSync(join(ROOT, "src", "components", "ArticleView.tsx"))).toBe(
      false,
    );
  });

  it("drops the unreachable savedSummary prop", () => {
    expect(source()).not.toContain("savedSummary");
  });
});

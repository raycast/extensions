import { describe, expect, it } from "vitest";
import { summarize } from "../src/lib/text";

describe("summarize", () => {
  it("returns the input unchanged when shorter than max", () => {
    expect(summarize("Short string", 120)).toBe("Short string");
  });

  it("returns empty string for null / undefined / empty input", () => {
    expect(summarize(null)).toBe("");
    expect(summarize(undefined)).toBe("");
    expect(summarize("")).toBe("");
  });

  it("cuts at the first sentence boundary when one lands inside the window", () => {
    const text = "First sentence ends here. Second sentence continues with more content that pushes past the limit.";
    const out = summarize(text, 80);
    expect(out).toBe("First sentence ends here.");
  });

  it("hard-truncates with ellipsis at a word boundary when no sentence break is available", () => {
    const text = "a ".repeat(200);
    const out = summarize(text, 50);
    expect(out.length).toBeLessThanOrEqual(50 + 1);
    expect(out.endsWith("…")).toBe(true);
  });

  it("collapses internal whitespace", () => {
    expect(summarize("a    b\n\nc", 120)).toBe("a b c");
  });

  it("does not use sentence boundary if it falls absurdly early", () => {
    // Single short sentence followed by a very long one: still want first sentence.
    const text = "A. Then a much longer sentence that goes on and on and on past the window edge for sure.";
    const out = summarize(text, 50);
    // First sentence "A." is only 2 chars (well below 0.4 * 50 = 20), so should hard-truncate instead.
    expect(out).not.toBe("A.");
  });

  it("handles a representative upstream description gracefully", () => {
    const upstream =
      "Generates a morning briefing that triages your inbox and previews your day using the Superhuman Mail MCP server — acting as an AI chief of staff. Use this skill whenever someone asks to brief me on my day, triage my inbox, what is important in my email, summarize my unread emails, what do I need to deal with today, chief of staff briefing, morning update, inbox summary, what emails need my attention, clear my inbox, or any variation of wanting a prioritized view of their email and calendar before they start working.";
    const out = summarize(upstream);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.length).toBeGreaterThan(20);
  });
});

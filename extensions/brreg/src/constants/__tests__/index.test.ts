import { describe, expect, it } from "vitest";
import { getChangelogMarkdown } from "../index";

describe("getChangelogMarkdown", () => {
  it("always appends changelog action shortcut hints", () => {
    const knownVersionMarkdown = getChangelogMarkdown("1.0.0");
    const unknownVersionMarkdown = getChangelogMarkdown("1.0.1");

    expect(knownVersionMarkdown).toContain("`Enter` closes this changelog.");
    expect(knownVersionMarkdown).toContain("`Shift+Enter` opens Keyboard Shortcuts.");
    expect(unknownVersionMarkdown).toContain("`Enter` closes this changelog.");
    expect(unknownVersionMarkdown).toContain("`Shift+Enter` opens Keyboard Shortcuts.");
  });
});

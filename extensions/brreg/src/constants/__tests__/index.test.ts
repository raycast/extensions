import { describe, expect, it } from "vitest";
import { getChangelogMarkdown, HAS_CHANGELOG_HIGHLIGHTS_FOR_CURRENT_VERSION } from "../index";

describe("getChangelogMarkdown", () => {
  it("requires an explicit changelog highlights entry for the current app version", () => {
    expect(HAS_CHANGELOG_HIGHLIGHTS_FOR_CURRENT_VERSION).toBe(true);
  });

  it("always appends changelog action shortcut hints", () => {
    const knownVersionMarkdown = getChangelogMarkdown("1.0.0");
    const unknownVersionMarkdown = getChangelogMarkdown("1.0.1");

    expect(knownVersionMarkdown).toContain("`Enter` closes this changelog.");
    expect(knownVersionMarkdown).toContain("`Shift+Enter` opens Keyboard Shortcuts.");
    expect(unknownVersionMarkdown).toContain("`Enter` closes this changelog.");
    expect(unknownVersionMarkdown).toContain("`Shift+Enter` opens Keyboard Shortcuts.");
  });

  it("falls back to generic release messaging when highlights for a version are missing", () => {
    const unknownVersion = "2099.1.0";
    const markdown = getChangelogMarkdown(unknownVersion);

    expect(markdown).toContain(`**Updated to version ${unknownVersion}**`);
    expect(markdown).toContain("See the latest improvements and fixes in this release.");
    expect(markdown).not.toContain("Key features include:");
  });
});

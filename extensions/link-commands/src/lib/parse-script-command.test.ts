import { describe, expect, it } from "vitest";
import { slugify } from "./parse-script-command";
import { disambiguateTitleSlugs } from "./discover-script-commands";
import type { ScriptCommand } from "./types";

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Quit Flux")).toBe("quit-flux");
  });

  it("collapses repeated dashes", () => {
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
  });

  it("removes disallowed characters rather than treating as separators", () => {
    expect(slugify("github.com")).toBe("githubcom");
  });

  it("strips combining marks", () => {
    expect(slugify("Café")).toBe("cafe");
  });

  it("trims and handles edge cases", () => {
    expect(slugify("  Leading and Trailing  ")).toBe("leading-and-trailing");
  });

  it("handles Script Commands → script-commands", () => {
    expect(slugify("Script Commands")).toBe("script-commands");
  });
});

describe("disambiguateTitleSlugs", () => {
  const baseCommand = (overrides: Partial<ScriptCommand> = {}): ScriptCommand => ({
    path: "/fake/path.sh",
    directory: "/fake",
    filename: "path.sh",
    deeplinkId: "path",
    titleSlug: "duplicate-title",
    deeplink: "raycast://script-commands/path",
    body: "",
    isExecutable: true,
    schemaVersion: "1",
    title: "Duplicate Title",
    argumentsList: [],
    ...overrides,
  });

  it("leaves unique slugs alone", () => {
    const commands = [
      baseCommand({ titleSlug: "unique-one", title: "Unique One" }),
      baseCommand({ titleSlug: "unique-two", title: "Unique Two" }),
    ];
    const result = disambiguateTitleSlugs(commands);
    expect(result[0].titleSlug).toBe("unique-one");
    expect(result[1].titleSlug).toBe("unique-two");
  });

  it("disambiguates duplicate slugs with filename suffix", () => {
    const commands = [
      baseCommand({ filename: "first.sh", titleSlug: "duplicate-title" }),
      baseCommand({ filename: "second.sh", titleSlug: "duplicate-title" }),
    ];
    const result = disambiguateTitleSlugs(commands);
    expect(result[0].titleSlug).toBe("duplicate-title");
    expect(result[1].titleSlug).toBe("duplicate-title-second");
  });

  it("handles three or more duplicates", () => {
    const commands = [
      baseCommand({ filename: "first.sh", titleSlug: "duplicate-title" }),
      baseCommand({ filename: "second.sh", titleSlug: "duplicate-title" }),
      baseCommand({ filename: "third.sh", titleSlug: "duplicate-title" }),
    ];
    const result = disambiguateTitleSlugs(commands);
    expect(result[0].titleSlug).toBe("duplicate-title");
    expect(result[1].titleSlug).toBe("duplicate-title-second");
    expect(result[2].titleSlug).toBe("duplicate-title-third");
  });

  it("mixed unique and duplicate slugs", () => {
    const commands = [
      baseCommand({ titleSlug: "unique", title: "Unique" }),
      baseCommand({ filename: "first.sh", titleSlug: "duplicate-title" }),
      baseCommand({ filename: "second.sh", titleSlug: "duplicate-title" }),
      baseCommand({ titleSlug: "another", title: "Another" }),
    ];
    const result = disambiguateTitleSlugs(commands);
    expect(result[0].titleSlug).toBe("unique");
    expect(result[1].titleSlug).toBe("duplicate-title");
    expect(result[2].titleSlug).toBe("duplicate-title-second");
    expect(result[3].titleSlug).toBe("another");
  });
});

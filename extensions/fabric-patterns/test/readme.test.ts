import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_FABRIC_PATH, INTEL_FABRIC_PATHS } from "../lib/paths";

const root = join(import.meta.dir, "..");
const text = (f: string) => (existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "");
const pkg = JSON.parse(text("package.json")) as {
  commands: { title: string }[];
  preferences: { name: string; title: string; default?: string }[];
};
const pref = (name: string) => pkg.preferences.find((p) => p.name === name)!;

describe("ISC-92: the README gets a stranger from nothing to a first run", () => {
  const readme = text("README.md");

  test("README.md exists", () => {
    expect(readme.length).toBeGreaterThan(0);
  });

  test.each([
    ["the Homebrew install", "brew install fabric-ai"],
    // After the link step, so the short name, as the guide's Install page runs it.
    ["fabric's own setup", "fabric --setup"],
    // brew --prefix, so the same line works on Apple Silicon and Intel.
    ["the fabric link", 'ln -s "$(brew --prefix)/bin/fabric-ai" "$(brew --prefix)/bin/fabric"'],
    ["where fabric keeps its Custom Patterns setting", "fabric --setup` › Custom Patterns"],
    ["the clipboard fallback", "else the selected text, else the clipboard"],
    ["the Fabric Path default", DEFAULT_FABRIC_PATH],
    ["the Intel fallback", INTEL_FABRIC_PATHS[0]],
    ["the Save Folder default", pref("saveFolder").default!],
    ["when old background runs are removed", "over 7 days old, the next time you open Show Background Runs"],
    // osascript's notifications are credited to Script Editor; with it off, macOS drops them silently.
    ["the Script Editor notification setting", "System Settings › Notifications › Script Editor"],
  ])("names %s", (_what, needle) => {
    expect(readme).toContain(needle);
  });

  // A list item each, so a title that only turns up in passing elsewhere doesn't count.
  test("gives every command and every preference its own `- **Title**` item", () => {
    const titles = [...pkg.commands, ...pkg.preferences].map((x) => x.title);
    expect(titles.filter((t) => !readme.includes(`\n- **${t}**:`))).toEqual([]);
  });
});

describe("ISC-93: CHANGELOG.md is in Raycast's format", () => {
  test("the first entry has a `## [<title>] - {PR_MERGE_DATE}` heading", () => {
    const first = text("CHANGELOG.md")
      .split("\n")
      .find((l) => l.startsWith("## "));
    expect(first ?? "no `## ` heading").toMatch(/^## \[[^\]]+\] - \{PR_MERGE_DATE\}$/);
  });
});

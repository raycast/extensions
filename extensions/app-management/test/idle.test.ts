// I-1: no timers, no `interval`, no `menu-bar`, no cross-extension launch, no resident process (SPEC.md §2.2, §11.6).
// Static checks over the new src/ and manifest, combining both source projects' checks.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd(); // npm test runs from the repository root

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const sources = walk(join(root, "src"));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  commands: Array<{ name: string; mode: string; interval?: string }>;
  dependencies: Record<string, string>;
};

describe("I-1 no resident work", () => {
  it("src/ has no setInterval or setTimeout", () => {
    for (const file of sources) assert.ok(!/\bset(Interval|Timeout)\s*\(/.test(readFileSync(file, "utf8")), file);
  });

  it("the manifest has no interval and no menu-bar command, and exactly the three §1.1 commands plus the two hotkey quit commands", () => {
    assert.deepEqual(
      manifest.commands.map((c) => [c.name, c.mode, c.interval]),
      [
        ["manage-apps", "no-view", undefined],
        ["app-list", "view", undefined],
        ["configure-app-management", "view", undefined],
        ["quit-selected-app", "view", undefined],
        ["quit-other-apps", "view", undefined],
      ],
    );
  });

  it("launchCommand targets only our own app-list or Raycast's built-in Empty Trash (§1.2: never the old extensions)", () => {
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const call of text.match(/launchCommand\([^)]*\)/gs) ?? []) {
        if (/^launchCommand\(\{\s*\.\.\.EMPTY_TRASH_COMMAND,/.test(call)) continue; // raycast/system-actions (§9)
        assert.ok(!/extensionName|ownerOrAuthorName/.test(call), `${file}: ${call}`);
        assert.ok(/name:\s*"app-list"/.test(call), `${file}: ${call}`);
      }
      // The only other extension named anywhere is Raycast's own System Actions.
      for (const m of text.matchAll(/ownerOrAuthorName:\s*"([^"]+)"/g)) assert.equal(m[1], "raycast", file);
    }
  });

  it("no network modules, fetch, Pro APIs, or AI APIs in src/", () => {
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      assert.ok(!/from "node:(http|https|net|dgram|tls)"|\bfetch\(|XMLHttpRequest|WebSocket/.test(text), file);
      assert.ok(!/WindowManagement|\bAI\.|OAuth|BrowserExtension/.test(text), file);
    }
  });

  it("runtime dependency is @raycast/api only", () => {
    assert.deepEqual(Object.keys(manifest.dependencies), ["@raycast/api"]);
  });

  it("never stores badge values or window titles: the storage keys are the six of §5.3, the selection pair, and the §9 utility pins", () => {
    const keys = new Set<string>();
    for (const file of sources) {
      for (const m of readFileSync(file, "utf8").matchAll(/STORAGE_KEY\s*=\s*"([^"]+)"/g)) keys.add(m[1]);
    }
    assert.deepEqual([...keys].sort(), [
      "apps.v1",
      "filter.v1",
      "listState.v1",
      "pins.v1",
      "recent.v1",
      "selection.v1",
      "setup.v1",
      "sort.v1",
      "utilityPins.v1",
    ]);
  });
});

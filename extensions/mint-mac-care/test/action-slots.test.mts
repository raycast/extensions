import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Raycast gives a panel's second action ⌘↵ (⌘⇧↵ in a Form). It never deletes, moves, quits, changes a setting or
// asks Mint to act: that slot reads (Show in Finder, Open Mint, a list), and what changes something has its own key.
const src = join(import.meta.dirname, "..", "src");
const read = (file: string) => readFileSync(join(src, file), "utf8");

test("no action claims ⌘↵ for itself", () => {
  for (const file of readdirSync(src).filter((name) => name.endsWith(".tsx"))) {
    assert.doesNotMatch(read(file), /modifiers: \["cmd"\], key: "return"/, file);
  }
});

test("in each chooser and list that changes something, a read-only action comes before it", () => {
  // [file, the read-only action that takes the second slot, the action that must come after it]
  const panels: Array<[string, string, string]> = [
    ["mint-trash.tsx", "<Action.ShowInFinder", 'title="Empty the Whole Trash…"'],
    ["mint-trash.tsx", "<Action.ShowInFinder", "Chosen Item"],
    ["mint-rules.tsx", "<Action.ShowInFinder path={row.path}", "to the Trash`}"],
    ["mint-uninstall.tsx", "<Action.ShowInFinder path={item.path}", 'title="Move Chosen to Trash"'],
    ["mint-scan.tsx", "<Action.ShowInFinder path={entry.path}", 'title="Clean Chosen"'],
    ["mint-scan.tsx", "<Action.ShowInFinder path={entry.path}", 'title="Move Chosen to Trash"'],
    ["mint-memory.tsx", "<Action.ShowInFinder path={app.bundlePath}", 'title={`Quit ${plural(picked.length, "App")}`}'],
    ["mint-handling.tsx", "<Action.ShowInFinder path={row.path}", 'title="Treat as Usual…"'],
    ["mint-conversations.tsx", "<Action.ShowInFinder path={archive.path}", "Optimize Archive…"],
    ["mint-optimize.tsx", 'title={bothHalves ? "Show Every File" : "Show Every Copy"}', "Only`}"],
    ["mint-autocare.tsx", '<Action title="Open Mint"', 'title="As Files Arrive"'],
    ["mint-organize.tsx", "<Action.ShowInFinder path={folder.path}", 'title="Change Template"'],
  ];
  for (const [file, reads, changes] of panels) {
    const text = read(file);
    const changeAt = text.indexOf(changes);
    assert.ok(changeAt > 0, `${file}: ${changes} not found`);
    const readAt = text.lastIndexOf(reads, changeAt);
    assert.ok(readAt > 0, `${file}: ${reads} must come before ${changes}`);
  }
});

test("an action in a panel's first two places declares no key of its own (Raycast shows ↵ and ⌘↵ there)", () => {
  // [file, where the action's element starts or its title]
  const firstTwo: Array<[string, string]> = [
    ["mint-trash.tsx", "<Action.ShowInFinder path={item.path}"],
    ["mint-uninstall.tsx", "<Action.ShowInFinder path={item.path}"],
    ["mint-scan.tsx", "<Action.ShowInFinder path={entry.path}"],
    ["mint-memory.tsx", "<Action.ShowInFinder path={app.bundlePath}"],
    ["mint-scan.tsx", 'title="See by Source"'],
    ["mint-scan.tsx", 'title="Choose Items"'],
    ["mint-optimize.tsx", 'title={bothHalves ? "Show Every File" : "Show Every Copy"}'],
    ["mint-organize.tsx", 'title="See Every File"'],
    ["mint-memory.tsx", 'title="Choose Apps"'],
    ["mint-uninstall.tsx", 'title="Choose What to Remove"'],
    ["mint-autocare.tsx", 'title={row.on ? "Change Types…" : "Choose Types…"}'],
    ["mint-history.tsx", 'title="Refresh"'],
    ["mint-actions.tsx", '<Action title="Refresh"'],
  ];
  for (const [file, marker] of firstTwo) {
    const text = read(file);
    const at = text.indexOf(marker);
    assert.ok(at > 0, `${file}: ${marker} not found`);
    const start = text.lastIndexOf("<Action", at);
    const ends = ["target=", "onAction=", "/>"].map((end) => text.indexOf(end, at)).filter((index) => index > 0);
    assert.doesNotMatch(text.slice(start, Math.min(...ends)), /shortcut=/, `${file}: ${marker}`);
  }
});

test("an action whose place depends on what the panel shows takes its key through ownKey", () => {
  assert.match(read("mint-actions.tsx"), /return before >= 2 \? shortcut : undefined;/);
  for (const file of [
    "mint-scan.tsx",
    "mint-memory.tsx",
    "mint-optimize.tsx",
    "mint-uninstall.tsx",
    "mint-organize.tsx",
  ]) {
    assert.match(read(file), /shortcut=\{ownKey\(/, file);
  }
  // An optimize action has its own key, never one of Raycast's common shortcuts meant for another action.
  for (const file of readdirSync(src).filter((name) => name.endsWith(".tsx"))) {
    assert.doesNotMatch(read(file), /Keyboard\.Shortcut\.Common\.OpenWith/, file);
  }
});

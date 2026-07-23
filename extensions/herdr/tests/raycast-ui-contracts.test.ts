import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shortcuts } from "../src/lib/shortcuts";

const reservedShortcuts = new Set([
  "cmd+w",
  "delete",
  "deleteForward",
  "cmd+delete",
  "opt+delete",
  "escape",
  "cmd+k",
  "cmd+,",
  "cmd+p",
  "cmd+shift+/",
  "enter",
  "cmd+q",
  "cmd+escape",
  "cmd+enter",
  "cmd+a",
]);

function shortcutKey(shortcut: { modifiers: readonly string[]; key: string }) {
  const modifiers = [...shortcut.modifiers].sort();
  return [...modifiers, shortcut.key].join("+");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("Raycast UI contracts", () => {
  it("offers only terminal and Raycast-only focus behavior", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      preferences: Array<{ name: string; data?: Array<{ value: string }> }>;
    };
    const preference = manifest.preferences.find((item) => item.name === "terminalFocusBehavior");
    expect(preference?.data?.map((item) => item.value)).toEqual(["open", "none"]);
  });

  it("does not assign Raycast-reserved shared shortcuts", () => {
    for (const [name, shortcut] of Object.entries(shortcuts)) {
      expect(reservedShortcuts, `${name} uses reserved shortcut ${shortcutKey(shortcut)}`).not.toContain(
        shortcutKey(shortcut),
      );
    }
  });

  it("does not put actions inside List.EmptyView", () => {
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(path, "utf8");
      const emptyViews = source.match(/<List\.EmptyView\b[\s\S]*?\/>/g) || [];
      for (const emptyView of emptyViews) {
        expect(emptyView, `${path} passes actions to List.EmptyView`).not.toMatch(/\bactions\s*=/);
      }
    }
  });
});

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

  // Attach stays the Enter action by default so the upstream behavior is unchanged.
  it("offers attach and switch as session Enter actions, defaulting to attach", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      preferences: Array<{ name: string; default?: string; data?: Array<{ value: string }> }>;
    };
    const preference = manifest.preferences.find((item) => item.name === "sessionEnterAction");
    expect(preference?.data?.map((item) => item.value)).toEqual(["attach", "switch"]);
    expect(preference?.default).toBe("attach");
  });

  it("does not assign Raycast-reserved shared shortcuts", () => {
    for (const [name, shortcut] of Object.entries(shortcuts)) {
      expect(reservedShortcuts, `${name} uses reserved shortcut ${shortcutKey(shortcut)}`).not.toContain(
        shortcutKey(shortcut),
      );
    }
  });

  // CONTEXT.md reserves Switch for detach + attach + select, so only Manage
  // Sessions may title an action that way; elsewhere it opens the picker.
  it("titles only the real switch action Switch", () => {
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      if (path.endsWith("sessions.tsx") || !path.endsWith(".tsx")) continue;
      const titles = [...readFileSync(path, "utf8").matchAll(/"([^"\n]*\bSwitch\b[^"\n]*)"/g)].map((match) => match[1]);
      expect(titles, `${path} titles a non-switch action Switch`).toEqual([]);
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

  it("ends submenu titles with an ellipsis", () => {
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(path, "utf8");
      for (const line of source.split("\n")) {
        if (!line.includes(".Submenu") || !line.includes("title=")) continue;
        expect(line, `${path} submenu title missing ellipsis`).toMatch(/title=[^>]*…/);
      }
    }
  });
});

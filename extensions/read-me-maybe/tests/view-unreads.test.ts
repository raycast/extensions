import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { messageIcon, sourceRowIcon, sourceViewItems } from "../src/domain/view-unreads";
import type { StoredSource } from "../src/domain/source-catalog";
import type { SourceResult } from "../src/domain/unread-count";
import { aggregateStatusLabel } from "../src/domain/unread-count";

const messages: StoredSource = {
  id: "messages",
  name: "Messages",
  dockName: "Messages",
  appPath: "/System/Applications/Messages.app",
  enabled: true,
};
const slack: StoredSource = {
  id: "slack",
  name: "Slack",
  dockName: "Slack",
  appPath: "/Applications/Slack.app",
  enabled: false,
};
const telegram: StoredSource = { id: "telegram", name: "Telegram", dockName: "Telegram Lite", enabled: true };

/** A snapshot entry shaped like summarizeDockScan's output; field values beyond status don't matter here. */
function entry(id: string, label: string, unavailable = false): SourceResult {
  return {
    id,
    name: "Unused",
    openCommand: "",
    label,
    ...(unavailable ? {} : { contribution: 0 }),
    unavailable,
  };
}

describe("sourceRowIcon", () => {
  it("uses the app path's file icon", () => {
    expect(sourceRowIcon("/Applications/Slack.app")).toEqual({ fileIcon: "/Applications/Slack.app" });
  });

  it("falls back to the extension's message icon without an app path", () => {
    expect(sourceRowIcon(undefined)).toEqual(messageIcon);
    expect(messageIcon).toEqual({ source: { light: "message-light.png", dark: "message-dark.png" } });
  });
});

describe("sourceViewItems", () => {
  it("lists rows in stored insertion order with name, Dock item name, icon, and snapshot status", () => {
    const snapshotSources = [
      entry("messages", "3"),
      entry("slack", "Disabled placeholder", true),
      entry("telegram", "9+"),
    ];

    expect(sourceViewItems([messages, slack, telegram], snapshotSources)).toEqual([
      {
        id: "messages",
        title: "Messages",
        subtitle: "Messages",
        icon: { fileIcon: "/System/Applications/Messages.app" },
        status: { kind: "badge", label: "3" },
        enabled: true,
      },
      {
        id: "slack",
        title: "Slack",
        subtitle: "Slack",
        icon: { fileIcon: "/Applications/Slack.app" },
        // The row's Disabled flag wins: a disabled row is never scanned, so
        // any snapshot entry it still carries predates the disable.
        status: { kind: "disabled", label: "Disabled" },
        enabled: false,
      },
      {
        id: "telegram",
        title: "Telegram",
        subtitle: "Telegram Lite",
        icon: messageIcon,
        status: { kind: "badge", label: "9+" },
        enabled: true,
      },
    ]);
  });

  it("maps each snapshot label to its status kind: zero, attention, and unavailable reasons", () => {
    const snapshotSources = [
      entry("a", "0"),
      entry("b", "Unread activity"),
      entry("c", "Not available", true),
      entry("d", "Could not read badge", true),
    ];
    const rows = (ids: string[]): StoredSource[] => ids.map((id) => ({ id, name: id, dockName: id, enabled: true }));

    expect(sourceViewItems(rows(["a", "b", "c", "d"]), snapshotSources).map((item) => item.status)).toEqual([
      { kind: "zero", label: "0" },
      { kind: "attention", label: "Unread activity" },
      { kind: "unavailable", label: "Not available" },
      { kind: "unavailable", label: "Could not read badge" },
    ]);
  });

  it("marks an enabled row without a snapshot entry as not scanned", () => {
    // The command passes [] for both "no snapshot yet" (before the menu's
    // first background scan) and "snapshot without a reading" (a failed
    // aggregate carries no per-Source rows): the Active section header's
    // status subtitle explains why, the row shows that it has no reading.
    expect(sourceViewItems([messages], [])[0]?.status).toEqual({ kind: "notScanned", label: "Not scanned yet" });
  });

  it("ignores snapshot entries whose Source has left the Catalog", () => {
    const items = sourceViewItems([messages], [entry("removed", "7"), entry("messages", "2")]);

    expect(items).toHaveLength(1);
    expect(items[0].status).toEqual({ kind: "badge", label: "2" });
  });

  it("lists an emptied catalog as empty", () => {
    expect(sourceViewItems([], [entry("messages", "3")])).toEqual([]);
  });
});

describe("aggregateStatusLabel", () => {
  it("leaves a plain complete result unstated", () => {
    expect(aggregateStatusLabel({ kind: "complete", total: 3 })).toBeUndefined();
  });

  it("uses the menu's wording for every noteworthy aggregate", () => {
    expect(aggregateStatusLabel({ kind: "partial", total: 3 })).toBe("Partial Result (incomplete)");
    expect(aggregateStatusLabel({ kind: "empty" })).toBe("No readable Sources");
    expect(aggregateStatusLabel({ kind: "noSources" })).toBe("No sources enabled");
    expect(aggregateStatusLabel({ kind: "failed" })).toBe("Could not refresh");
    expect(aggregateStatusLabel({ kind: "accessibilityRequired" })).toBe("Accessibility access required");
    expect(aggregateStatusLabel({ kind: "automationRequired" })).toBe("Automation access required");
  });
});

describe("View Unreads command seams", () => {
  const projectRoot = process.cwd();
  const importPattern =
    /(?:\bimport|\bexport)\b[^"'()]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s*["']([^"']+)["']/g;

  function readProjectFile(relativePath: string): string {
    return readFileSync(path.join(projectRoot, relativePath), "utf8");
  }

  function resolveImport(fromFile: string, specifier: string): string | undefined {
    if (!specifier.startsWith(".")) return undefined;
    const base = path.join(path.dirname(fromFile), specifier);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
    return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  }

  function reachableModulesFrom(entry: string): { modules: Set<string>; specifiers: Set<string> } {
    const modules = new Set<string>();
    const specifiers = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.shift() as string;
      if (modules.has(file)) continue;
      modules.add(file);
      for (const match of readProjectFile(file).matchAll(importPattern)) {
        const specifier = match[1] ?? match[2] ?? match[3];
        if (!specifier) continue;
        specifiers.add(specifier);
        const resolved = resolveImport(file, specifier);
        if (resolved) queue.push(path.relative(projectRoot, resolved));
      }
    }
    return { modules, specifiers };
  }

  it("scans through the Dock-scan seam and reads the gate without writing access state", () => {
    const { modules } = reachableModulesFrom("src/view-unreads.tsx");
    const command = readProjectFile("src/view-unreads.tsx");

    // The on-demand refresh scans through the same dock-scan seam as the
    // menu and reads the Setup Gate read-only (ADR-0005); the AppleScript
    // boundary stays behind that seam — it may sit transitively in the
    // graph, but the command never imports the protocol itself.
    expect(modules).toContain("src/dock-scan.ts");
    expect(modules).toContain("src/setup-gate.ts");
    expect(command).not.toContain('from "./dock-scan-protocol"');

    // Reading the gate is load-only: the view must never transition the
    // Setup Gate or the Access Check Status — the menu owns those writes.
    expect(command).toContain("loadAccessCheckState");
    expect(command).not.toMatch(/saveAccessCheckState|recordBackgroundAccessResult|recordExplicitAccessCheck/);
  });

  it("spawns only through the Open Command seam", () => {
    const { modules, specifiers } = reachableModulesFrom("src/view-unreads.tsx");

    // Return-to-open is the one deliberate process spawn in this command; the
    // seam test pins it to open-source.ts so no other module grows a spawn.
    expect(modules).toContain("src/open-source.ts");
    expect(Array.from(specifiers)).toContain("node:child_process");
    expect(Array.from(modules).filter((file) => file.endsWith("open-source.ts"))).toHaveLength(1);
  });

  it("declares the view-unreads view command in the manifest", () => {
    const manifest = JSON.parse(readProjectFile("package.json")) as {
      commands: Array<{ name: string; title: string; mode: string }>;
    };

    expect(manifest.commands.find((command) => command.name === "view-unreads")).toEqual({
      name: "view-unreads",
      title: "View Unreads",
      description: expect.any(String),
      mode: "view",
    });
  });

  it("wires the menu's bottom action row to the launched command", () => {
    const menu = readProjectFile("src/show-read-me-maybe.tsx");

    expect(menu).toContain('title="View Unreads"');
    expect(menu).toContain("launchCommand(");
    expect(menu).toContain('name: "view-unreads"');
    expect(menu).toContain("LaunchType.UserInitiated");
  });

  it("persists snapshots from the menu's background cycle and the view's on-demand refresh, never from Check Access", () => {
    const menu = readProjectFile("src/show-read-me-maybe.tsx");
    const checkAccessBody = menu.slice(
      menu.indexOf("async function checkAccess"),
      menu.indexOf("function accessRequiredState"),
    );

    expect(menu).toContain("saveUnreadSnapshot(");
    // The Access Check Result is never retained: the explicit diagnostic must
    // not write the snapshot the view reads (ADR-0005).
    expect(checkAccessBody).not.toContain("saveUnreadSnapshot");

    // The view's on-demand refresh persists its scan so both surfaces keep
    // showing the same per-Source statuses.
    expect(readProjectFile("src/view-unreads.tsx")).toContain("saveUnreadSnapshot(");
  });

  it("pins Open Source as the default action and the row-management shortcuts", () => {
    const command = readProjectFile("src/view-unreads.tsx");
    const rowPanel = command.slice(command.indexOf("<ActionPanel>"));

    // The first action is the default one: Enter must open, not edit.
    expect(rowPanel.indexOf('title="Open Source"')).toBeLessThan(rowPanel.indexOf('title="Edit Source"'));
    expect(rowPanel.indexOf('title="Edit Source"')).toBeLessThan(rowPanel.indexOf('title="Toggle Enabled"'));
    expect(command).toContain("Keyboard.Shortcut.Common.Edit");
    expect(command).toContain("Keyboard.Shortcut.Common.New");
    // Tab toggles a Source between enabled and disabled without opening the
    // action panel — the one management edit users repeat per row.
    expect(command).toContain('modifiers: [], key: "tab"');
    // Opening a Source closes the window, mirroring the menu-bar row behavior.
    expect(command).toContain("closeMainWindow()");
  });

  it("reorders Sources from row hotkeys without a pushed Reorder view", () => {
    const command = readProjectFile("src/view-unreads.tsx");

    // opt+shift+arrows move the row within its section in place: there is no
    // Reorder view to push and no Common shortcut constant to reach for —
    // cmd+shift+arrows is the reserved-feeling Common.MoveUp/MoveDown pair,
    // so the literal opt+shift binding is pinned here instead.
    // Raycast's prefer-title-case rule fixes the titles to 'Move up' /
    // 'Move Down' — its noCaps list lowercases 'up' but not 'down'.
    expect(command).toContain('title="Move up"');
    expect(command).toContain('title="Move Down"');
    expect(command).toContain('modifiers: ["opt", "shift"], key: "arrowUp"');
    expect(command).toContain('modifiers: ["opt", "shift"], key: "arrowDown"');
    expect(command).not.toContain("ReorderSources");
    // The main list's bar is uncontrolled; filtering is pinned because it
    // defaults to off the moment an onSearchTextChange handler appears —
    // the explicit prop keeps native filtering alive across future edits.
    expect(command).toContain('searchBarPlaceholder="Filter Sources"');
    expect(command).toContain("filtering={true}");
  });
});

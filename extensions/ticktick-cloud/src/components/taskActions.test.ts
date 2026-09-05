import type { Keyboard } from "@raycast/api";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { Task } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import {
  resolveTaskActions,
  type TaskActionDescriptor,
  type TaskActionKey,
  type TaskActionShortcut,
} from "./taskActions";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-id",
    projectId: "project-id",
    projectName: "Work",
    title: "Ship the extension",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: false,
    timeZone: "UTC",
    ...overrides,
  };
}

function capabilities(overrides: Partial<BackendCapabilities> = {}): BackendCapabilities {
  return {
    create: false,
    update: false,
    complete: false,
    reopen: false,
    move: false,
    completedQuery: false,
    inboxQuery: false,
    exactTaskLink: false,
    ...overrides,
  };
}

function keys(actions: readonly TaskActionDescriptor[]): TaskActionKey[] {
  return actions.map((action) => action.key);
}

describe("task action contract", () => {
  it("keeps the public action-key union exact", () => {
    expectTypeOf<TaskActionKey>().toEqualTypeOf<
      "complete" | "reopen" | "edit" | "move" | "open-exact" | "search" | "copy" | "refresh"
    >();
  });

  it("exposes shortcuts that are statically assignable to the installed Raycast API type", () => {
    expectTypeOf<TaskActionShortcut>().toEqualTypeOf<Keyboard.Shortcut>();
  });

  it("returns the complete ordered action set for an open task", () => {
    const actions = resolveTaskActions(
      task({ exactUrl: "https://ticktick.com/webapp/#p/project-id/tasks/task-id" }),
      capabilities({ complete: true, reopen: true, update: true, move: true, exactTaskLink: true }),
      "backend-url"
    );

    expect(actions).toEqual([
      expect.objectContaining({ key: "complete", title: "Complete Task" }),
      expect.objectContaining({ key: "edit", title: "Edit Task" }),
      expect.objectContaining({ key: "move", title: "Move to List" }),
      expect.objectContaining({ key: "open-exact", title: "Open in TickTick" }),
      expect.objectContaining({ key: "search", title: "Search in TickTick" }),
      expect.objectContaining({ key: "copy", title: "Copy Task" }),
      expect.objectContaining({ key: "refresh", title: "Refresh" }),
    ]);
    expect(keys(actions)).not.toContain("reopen");
  });

  it("returns Reopen instead of Complete for a completed task", () => {
    const actions = resolveTaskActions(
      task({ status: "completed" }),
      capabilities({ complete: true, reopen: true, update: true, move: true }),
      "native-project-uri"
    );

    expect(keys(actions)).toEqual(["reopen", "edit", "move", "open-exact", "search", "copy", "refresh"]);
  });

  it("gates status mutations, edit, and move independently by capability", () => {
    expect(keys(resolveTaskActions(task(), capabilities({ reopen: true, update: true }), undefined))).toEqual([
      "edit",
      "search",
      "copy",
      "refresh",
    ]);
    expect(
      keys(resolveTaskActions(task({ status: "completed" }), capabilities({ complete: true, move: true }), undefined))
    ).toEqual(["move", "search", "copy", "refresh"]);
  });

  it("always keeps Search, Copy, and Refresh separate and in that order", () => {
    const actions = resolveTaskActions(task(), capabilities(), undefined);

    expect(actions).toEqual([
      expect.objectContaining({ key: "search", title: "Search in TickTick" }),
      expect.objectContaining({ key: "copy", title: "Copy Task" }),
      expect.objectContaining({ key: "refresh", title: "Refresh" }),
    ]);
    expect(actions.some((action) => action.title === "Open in TickTick")).toBe(false);
  });
});

describe("exact-open visibility", () => {
  const safeExactUrl = "https://ticktick.com/webapp/#p/project-id/tasks/task-id";

  it.each([
    ["backend-url", true, safeExactUrl, true],
    ["backend-url", false, safeExactUrl, false],
    ["backend-url", true, undefined, false],
    ["backend-url", true, "", false],
    ["backend-url", true, "not a URL", false],
    ["backend-url", true, "javascript:alert(1)", false],
    ["backend-url", true, "https://ticktick.com.evil.example/task-id", false],
    ["backend-url", true, "https://user:password@ticktick.com/task-id", false],
    ["native-project-uri", false, undefined, true],
    [undefined, true, safeExactUrl, false],
  ] as const)(
    "uses only the explicitly qualified strategy (strategy=%s, capability=%s)",
    (strategy, exactTaskLink, exactUrl, expected) => {
      const actions = resolveTaskActions(task({ exactUrl }), capabilities({ exactTaskLink }), strategy);
      expect(keys(actions).includes("open-exact")).toBe(expected);
    }
  );

  it.each([
    { id: "" },
    { id: " \t " },
    { id: "task\u0000id" },
    { id: "task\u0085id" },
    { id: "task\u202eid" },
    { id: "task\ud800id" },
    { projectId: "" },
    { projectId: " \n " },
    { projectId: "project\u001fid" },
    { projectId: "project\u009fid" },
    { projectId: "project\u202eid" },
    { projectId: "project\udc00id" },
  ])("hides native exact open when the task reference cannot produce a valid native URI", (overrides) => {
    const actions = resolveTaskActions(task(overrides), capabilities(), "native-project-uri");

    expect(keys(actions)).toEqual(["search", "copy", "refresh"]);
  });

  it("does not silently turn a rejected exact URL into an exact-open action", () => {
    const actions = resolveTaskActions(
      task({ exactUrl: "https://attacker.example/task-id", title: "same title as another task" }),
      capabilities({ exactTaskLink: true }),
      "backend-url"
    );

    expect(keys(actions)).toEqual(["search", "copy", "refresh"]);
    expect(actions.find((action) => action.key === "search")?.title).toBe("Search in TickTick");
  });
});

describe("descriptor safety", () => {
  it("does not copy task identifiers, URLs, titles, content, descriptions, tags, or project names into descriptors", () => {
    const marker = "PRIVATE-MARKER-6b3844";
    const actions = resolveTaskActions(
      task({
        id: `${marker}-id`,
        projectId: `${marker}-project-id`,
        projectName: `${marker}-project-name`,
        title: `${marker}-title`,
        content: `${marker}-content`,
        description: `${marker}-description`,
        tags: [`${marker}-tag`],
        exactUrl: `https://ticktick.com/${marker}-url`,
      }),
      capabilities({ complete: true, update: true, move: true, exactTaskLink: true }),
      "backend-url"
    );

    const serialized = JSON.stringify(actions);
    expect(serialized).not.toContain(marker);
    for (const action of actions) {
      expect(Object.keys(action).sort()).toEqual(action.shortcut ? ["key", "shortcut", "title"] : ["key", "title"]);
    }
  });

  it("uses Raycast-compatible explicit mappings for both platforms without cmd on Windows", () => {
    const actions = resolveTaskActions(
      task({ exactUrl: "https://ticktick.com/webapp/#p/project-id/tasks/task-id" }),
      capabilities({ complete: true, update: true, move: true, exactTaskLink: true }),
      "backend-url"
    );

    for (const action of actions) {
      const shortcut: Keyboard.Shortcut | undefined = action.shortcut;
      if (!shortcut) continue;

      expect("macOS" in shortcut).toBe(true);
      expect("Windows" in shortcut).toBe(true);
      if (!("macOS" in shortcut) || !("Windows" in shortcut)) throw new Error("Expected an explicit platform shortcut");

      expect(shortcut.macOS.modifiers.length).toBeGreaterThan(0);
      expect(shortcut.Windows.modifiers.length).toBeGreaterThan(0);
      expect(shortcut.Windows.modifiers).not.toContain("cmd");
    }
  });

  it("returns deeply immutable descriptors without mutating frozen inputs", () => {
    const sourceTask = Object.freeze(task({ exactUrl: "https://ticktick.com/webapp/#p/task-id" }));
    const sourceCapabilities = Object.freeze(capabilities({ update: true, exactTaskLink: true }));
    const actions = resolveTaskActions(sourceTask, sourceCapabilities, "backend-url");

    expect(Object.isFrozen(actions)).toBe(true);
    expect(actions.every((action) => Object.isFrozen(action))).toBe(true);
    expect(actions.filter((action) => action.shortcut).every((action) => Object.isFrozen(action.shortcut))).toBe(true);
    for (const action of actions) {
      const shortcut = action.shortcut;
      if (!shortcut || !("macOS" in shortcut) || !("Windows" in shortcut)) continue;
      expect(Object.isFrozen(shortcut.macOS)).toBe(true);
      expect(Object.isFrozen(shortcut.macOS.modifiers)).toBe(true);
      expect(Object.isFrozen(shortcut.Windows)).toBe(true);
      expect(Object.isFrozen(shortcut.Windows.modifiers)).toBe(true);
    }
    expect(sourceTask.exactUrl).toBe("https://ticktick.com/webapp/#p/task-id");
    expect(sourceCapabilities.exactTaskLink).toBe(true);
  });
});

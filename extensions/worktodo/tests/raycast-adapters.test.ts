import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const raycast = vi.hoisted(() => ({
  launchCommand: vi.fn<(options: unknown) => Promise<void>>(),
  showHUD: vi.fn<(title: string) => Promise<void>>(),
  showToast: vi.fn<(options: unknown) => Promise<void>>(),
}));

vi.mock("@raycast/api", () => ({
  Color: {
    Red: "red",
    SecondaryText: "secondary-text",
  },
  Icon: {
    ArrowCounterClockwise: "arrow-counter-clockwise",
    CheckCircle: "check-circle",
    Circle: "circle",
    Redo: "redo",
    Trash: "trash",
    Undo: "undo",
  },
  LaunchType: {
    Background: "background",
    UserInitiated: "userInitiated",
  },
  Toast: {
    Style: {
      Failure: "failure",
    },
  },
  launchCommand: raycast.launchCommand,
  showHUD: raycast.showHUD,
  showToast: raycast.showToast,
}));

import { LaunchType } from "@raycast/api";
import { showMenuBarFeedback } from "../src/menu-bar-feedback";
import { launchMyTasks, requestMenuBarRefresh } from "../src/raycast-commands";
import {
  taskLifecycleHistoryActionPresentation,
  taskLifecycleMutationActionPresentation,
} from "../src/task-lifecycle-raycast";
import { menuBarTaskIcon, taskListIcon } from "../src/task-priority-raycast";

beforeEach(() => {
  vi.resetAllMocks();
  raycast.launchCommand.mockResolvedValue(undefined);
  raycast.showHUD.mockResolvedValue(undefined);
  raycast.showToast.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Raycast command launches", () => {
  it("keeps menu bar refreshes background-launched", () => {
    requestMenuBarRefresh();

    expect(raycast.launchCommand).toHaveBeenCalledOnce();
    expect(raycast.launchCommand).toHaveBeenCalledWith({
      name: "menu-bar",
      type: LaunchType.Background,
    });
  });

  it("opens All tasks as user-initiated", async () => {
    await launchMyTasks({ view: "thisWeek", selectedTaskId: "task-1" });

    expect(raycast.launchCommand).toHaveBeenCalledWith({
      name: "my-tasks",
      type: LaunchType.UserInitiated,
      context: { view: "thisWeek", selectedTaskId: "task-1" },
    });
  });

  it("opens a selected All tasks item for editing", async () => {
    await launchMyTasks({ view: "today", selectedTaskId: "task-1", editTask: true });

    expect(raycast.launchCommand).toHaveBeenCalledWith({
      name: "my-tasks",
      type: LaunchType.UserInitiated,
      context: { view: "today", selectedTaskId: "task-1", editTask: true },
    });
  });

  it("shows one bounded failure when All Tasks cannot open", async () => {
    raycast.launchCommand.mockRejectedValueOnce(new Error("Command unavailable"));

    await expect(launchMyTasks({ view: "all" })).resolves.toBeUndefined();

    expect(raycast.showToast).toHaveBeenCalledOnce();
    expect(raycast.showToast).toHaveBeenCalledWith("failure", "Unable to open All Tasks");
  });

  it("keeps a failed background refresh silent", async () => {
    raycast.launchCommand.mockRejectedValueOnce(new Error("Command unavailable"));

    requestMenuBarRefresh();
    await Promise.resolve();

    expect(raycast.showToast).not.toHaveBeenCalled();
  });
});

describe("Backup & restore adapter boundary", () => {
  it("uses only the Portability service for backup workflows", () => {
    const source = readFileSync(join(process.cwd(), "src/backup-restore.tsx"), "utf8");

    expect(source).toContain("portability.exportTo(");
    expect(source).toContain("portability.prepare(");
    expect(source).toContain("portability.replace(");
    expect(source).not.toMatch(/from ["'].+\/(?:export-backup|import-preview|replace-backup|backup-workflows)["']/);
  });
});

describe("All tasks entry points", () => {
  it("uses consistent task actions and opens the full list from the menu bar", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      commands: { name: string; title: string; subtitle: string }[];
    };
    const menuBarSource = readFileSync(join(process.cwd(), "src/menu-bar.tsx"), "utf8");

    expect(manifest.commands.find((command) => command.name === "my-tasks")?.title).toBe("All Tasks");
    expect(menuBarSource).toContain('title="New Task"');
    expect(menuBarSource).not.toContain('title="New Task…"');
    expect(menuBarSource).toContain('title="All Tasks"');
    expect(menuBarSource).toContain('onAction={() => openMyTasks({ view: "all" })}');
  });

  it("uses the approved Store titles and subtitles", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      commands: { title: string; subtitle: string }[];
    };

    expect(manifest.commands.map((command) => command.title)).toEqual([
      "Menu Bar",
      "All Tasks",
      "Quick Add",
      "Backup & Restore",
    ]);
    expect(manifest.commands.map((command) => command.subtitle)).toEqual(Array(4).fill("Worktodo"));
  });

  it("includes the initial Store changelog entry", () => {
    const changelog = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(changelog).toContain("## [Initial Release] - {PR_MERGE_DATE}");
    expect(changelog).not.toMatch(/screenshot|MCP/iu);
  });
});

describe("interface copy", () => {
  it("hides task subtitles when the detail pane is visible", () => {
    const tasks = readFileSync(join(process.cwd(), "src/my-tasks.tsx"), "utf8");

    expect(tasks).toContain("subtitle={isShowingDetail ? undefined : item.subtitle}");
  });

  it("reserves ellipses for truncated content", () => {
    const files = [
      "backup-restore.tsx",
      "menu-bar.tsx",
      "my-tasks.tsx",
      "project-management.tsx",
      "quick-add.tsx",
      "task-form.tsx",
      "task-form-controls.tsx",
      "task-views.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(join(process.cwd(), "src", file), "utf8");
      expect(source, file).not.toMatch(/title="[^"]*(?:…|\.\.\.)[^"]*"/u);
    }
  });

  it("distinguishes opening a new-task form from creating the task", () => {
    const tasks = readFileSync(join(process.cwd(), "src/my-tasks.tsx"), "utf8");
    const taskForm = readFileSync(join(process.cwd(), "src/task-form.tsx"), "utf8");
    const quickAdd = readFileSync(join(process.cwd(), "src/quick-add.tsx"), "utf8");

    expect(tasks).toContain('title="New Task"');
    expect(taskForm).toContain('navigationTitle={task ? "Edit task" : "New task"}');
    expect(taskForm).toContain('title={task ? "Save Task" : "Create Task"}');
    expect(quickAdd).toContain('navigationTitle="Quick add"');
    expect(quickAdd).toContain('title="Create Task"');
    expect(quickAdd).toContain('"Task created"');
  });

  it("omits Task when the parent menu already names it", () => {
    const menuBar = readFileSync(join(process.cwd(), "src/menu-bar.tsx"), "utf8");

    expect(menuBar).toContain('title="Complete"');
    expect(menuBar).toContain('title="Open"');
    expect(menuBar).toContain('title="Edit"');
    expect(menuBar).toContain('title="Move to Trash"');
    expect(menuBar).not.toContain('title="Complete Task"');
    expect(menuBar).not.toContain('title="Open Task"');
    expect(menuBar).not.toContain('title="Edit Task"');
  });
});

describe("binary priority adapters", () => {
  it("uses a checkbox and keeps Quick add unprioritized", () => {
    const taskForm = readFileSync(join(process.cwd(), "src/task-form.tsx"), "utf8");
    const quickAdd = readFileSync(join(process.cwd(), "src/quick-add.tsx"), "utf8");

    expect(taskForm).toContain(
      '<Form.Checkbox id="priority" label="Priority" value={priority} onChange={setPriority} />',
    );
    expect(taskForm).not.toContain('Form.Dropdown.Item value="high"');
    expect(quickAdd).toContain("priority: false");
  });

  it("uses a neutral menu-bar circle for every incomplete task and keeps list completion icons neutral", () => {
    expect(menuBarTaskIcon()).toEqual({
      source: "circle",
      tintColor: "#808080",
    });
    expect(taskListIcon({ kind: "all" }, false)).toBe("circle");
    expect(taskListIcon({ kind: "all" }, true)).toBe("check-circle");
    expect(taskListIcon({ kind: "completed" }, false)).toBe("check-circle");
    expect(taskListIcon({ kind: "trash" }, false)).toBe("trash");
  });
});

describe("Label UI adapters", () => {
  it("keeps Project selection flat and projects stable Label IDs through one TagPicker", () => {
    const source = readFileSync(join(process.cwd(), "src/task-form-controls.tsx"), "utf8");

    expect(source).toContain('<Form.Dropdown.Item value="no-project" title="No project"');
    expect(source).toContain("taskEditingProjectKey(project.id)");
    expect(source).toContain('<Form.TagPicker id="labels" title="Labels" value={value}');
    expect(source).toContain("<Form.TagPicker.Item key={label.id} value={label.id} title={label.name} />");
    expect(source).not.toContain("Section");
  });

  it("submits selected labels from Quick add and the full task form", () => {
    const quickAdd = readFileSync(join(process.cwd(), "src/quick-add.tsx"), "utf8");
    const taskForm = readFileSync(join(process.cwd(), "src/task-form.tsx"), "utf8");

    expect(quickAdd).toContain("labels: session.service.listLabels()");
    expect(quickAdd).toContain("selectedLabelIds,");
    expect(quickAdd).toContain("labels={state.labels}");
    expect(taskForm).toContain("taskEditingDefaults(task, initialProjectId");
    expect(taskForm).toContain("useState(defaults.selectedLabelIds)");
    expect(taskForm).toContain("editing.assignLabels(task.id, selectedLabelIds)");
    expect(taskForm).toContain('navigationTitle="Edit labels"');
  });

  it("offers global Label management and refreshes it through the external-mutation path", () => {
    const tasks = readFileSync(join(process.cwd(), "src/my-tasks.tsx"), "utf8");
    const management = readFileSync(join(process.cwd(), "src/project-management.tsx"), "utf8");

    expect(tasks).toContain('title="Manage Labels"');
    expect(tasks).toContain("<LabelsView service={session.service} onChanged={refreshAfterUnrelatedMutation} />");
    expect(tasks).toContain("lifecycle.current?.refreshAfterExternalMutation()");
    expect(tasks).toContain('<List.Item.Detail.Metadata.TagList title="Labels">');
    expect(tasks).toContain('title="Edit Labels"');
    expect(tasks).toContain("item.task.trashedAtMs === null");
    expect(tasks).not.toContain("item.task.completedAtMs === null && item.task.trashedAtMs === null");
    expect(management).toContain('navigationTitle="Labels"');
    expect(management).toContain("const confirmed = await confirmAlert(");
    expect(management).toContain("if (!confirmed)");
    expect(management).toContain("Tasks keep their content and projects. The label and its assignments are removed.");
  });

  it("keeps Labels secondary to date, Project, and status navigation", () => {
    const tasks = readFileSync(join(process.cwd(), "src/my-tasks.tsx"), "utf8");
    const views = readFileSync(join(process.cwd(), "src/task-views.tsx"), "utf8");
    const presentation = readFileSync(join(process.cwd(), "src/shared/presentation/task-list.ts"), "utf8");

    const orderedMarkers = [
      'value="all"',
      'value="today"',
      'value="thisWeek"',
      'title="Projects"',
      'title="Status"',
      'value="completed"',
      'value="trash"',
    ];
    const positions = orderedMarkers.map((marker) => views.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(views).not.toContain('<List.Dropdown.Section title="Labels">');
    expect(views).not.toContain("value={`label:${label.id}`}");
    expect(tasks).toContain("normalizeTaskView(view, projects, labels)");
    expect(tasks).toContain("initialProjectId={initialProjectIdForTaskView(view)}");
    expect(tasks).not.toContain("initialLabelIdsForTaskView");
    expect(presentation).toContain("keywords: [project, entry.task.notes, ...labelNames]");
  });
});

describe("menu bar feedback", () => {
  it("shows a Toast for user-initiated launches", async () => {
    const options = { title: "Task completed", message: "Submit report" };

    await showMenuBarFeedback(LaunchType.UserInitiated, options);

    expect(raycast.showToast).toHaveBeenCalledWith(options);
    expect(raycast.showHUD).not.toHaveBeenCalled();
  });

  it("uses a HUD instead of a Toast for background launches", async () => {
    await showMenuBarFeedback(LaunchType.Background, {
      title: "Unable to open tasks",
      message: "Command unavailable",
    });

    expect(raycast.showHUD).toHaveBeenCalledWith("Unable to open tasks: Command unavailable");
    expect(raycast.showToast).not.toHaveBeenCalled();
  });

  it("falls back to a HUD when a user-initiated Toast fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    raycast.showToast.mockRejectedValue(new Error("Toast unavailable"));

    await showMenuBarFeedback(LaunchType.UserInitiated, { title: "Task completed" });

    expect(raycast.showHUD).toHaveBeenCalledWith("Task completed");
    expect(consoleError).toHaveBeenCalledWith("Unable to show menu bar Toast", expect.any(Error));
  });

  it("logs and suppresses a final HUD failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    raycast.showHUD.mockRejectedValue(new Error("HUD unavailable"));

    await expect(
      showMenuBarFeedback(LaunchType.Background, { title: "Unable to complete task" }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("Unable to show menu bar HUD", expect.any(Error));
  });
});

describe("task lifecycle actions", () => {
  it.each([
    ["undo", "complete", "Undo Completion", "undo", ["cmd"]],
    ["redo", "complete", "Redo Completion", "redo", ["cmd", "shift"]],
    ["undo", "trash", "Undo Move to Trash", "undo", ["cmd"]],
    ["redo", "trash", "Redo Move to Trash", "redo", ["cmd", "shift"]],
  ] as const)("projects %s %s labels, icons, and shortcuts for Raycast", (direction, kind, title, icon, modifiers) => {
    expect(
      taskLifecycleHistoryActionPresentation({
        direction,
        kind,
        taskId: "task-1",
        revision: { updatedAtMs: 1_000, completedAtMs: null, trashedAtMs: null },
        taskTitle: "Submit report",
      }),
    ).toEqual({
      title,
      icon,
      shortcut: { modifiers: [...modifiers], key: "z" },
    });
  });

  it("projects mutation labels and icons without binding persistence", () => {
    expect(taskLifecycleMutationActionPresentation("complete")).toEqual({
      title: "Complete Task",
      successTitle: "Task completed",
      failureTitle: "Unable to complete task",
      icon: "check-circle",
    });
    expect(taskLifecycleMutationActionPresentation("reopen")).toMatchObject({
      title: "Reopen Task",
      icon: "circle",
    });
    expect(taskLifecycleMutationActionPresentation("trash")).toMatchObject({
      title: "Move to Trash",
      icon: "trash",
    });
    expect(taskLifecycleMutationActionPresentation("restore")).toMatchObject({
      title: "Restore Task",
      icon: "arrow-counter-clockwise",
    });
  });
});

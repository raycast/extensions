import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_COMMANDS = [
  "create-task.tsx",
  "current-task.tsx",
  "quick-add.tsx",
  "view-archived.tsx",
  "view-projects.tsx",
  "view-scheduled.tsx",
  "view-tags.tsx",
  "view-tasks.tsx",
  "view-today.tsx",
];

const ERROR_STATE_COMMANDS = [
  "current-task.tsx",
  "view-archived.tsx",
  "view-projects.tsx",
  "view-scheduled.tsx",
  "view-tasks.tsx",
  "view-today.tsx",
];

function readSource(filename: string): string {
  return readFileSync(join(__dirname, filename), "utf8");
}

describe("Raycast Store navigation requirements", () => {
  it.each(ROOT_COMMANDS)("%s leaves the root navigation title unchanged", (filename) => {
    const source = readSource(filename);
    const commandBody = source.slice(source.indexOf("export default function Command"));

    expect(commandBody).not.toMatch(/navigationTitle=/);
  });

  it("pushes project task lists onto Raycast's navigation stack", () => {
    const source = readSource("view-projects.tsx");

    expect(source).toContain("<Action.Push");
    expect(source).not.toContain("setSelectedProject");
  });
});

describe("review follow-ups", () => {
  it.each(["create-task.tsx", "quick-add.tsx"])("%s does not shadow the global fetch function", (filename) => {
    expect(readSource(filename)).not.toContain("async function fetch()");
  });

  it("does not keep an unreachable Inbox filter branch", () => {
    expect(readSource("view-tasks.tsx")).not.toContain('projectId === "inbox"');
  });

  it.each(["current-task.tsx", "menu-bar.tsx"])("%s starts tracking through the task start endpoint", (filename) => {
    const source = readSource(filename);

    expect(source).toContain("startTask");
    expect(source).not.toMatch(/\bsetCurrentTask\(/);
  });

  it("validates time estimates before creating tasks", () => {
    const source = readSource("create-task.tsx");

    expect(source).toContain("Number.isFinite");
    expect(source).toContain("Time estimate must be a positive number");
  });

  it("rejects empty tag names before calling the API", () => {
    const source = readSource("view-tags.tsx");

    expect(source).toContain("Tag name is required");
  });

  it("does not create a task after automatic tag creation fails", () => {
    const source = readSource("quick-add.tsx");

    expect(source).toContain("throw error;");
  });

  it.each(ERROR_STATE_COMMANDS)("%s distinguishes API failures from an empty result", (filename) => {
    expect(readSource(filename)).toContain("Could not load");
  });

  it("prevents stale task filters from overwriting the latest selection", () => {
    expect(readSource("view-tasks.tsx")).toContain("requestIdRef");
  });

  it("keeps command titles unique and the Store description concise", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")) as {
      description: string;
      commands: { title: string }[];
    };
    const titles = manifest.commands.map((command) => command.title);

    expect(new Set(titles).size).toBe(titles.length);
    expect(manifest.description.length).toBeLessThanOrEqual(160);
    expect(manifest.description).not.toContain("docs/");
  });
});

describe("menu bar refresh", () => {
  it("configures background refresh for the menu-bar command", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")) as {
      commands: { name: string; interval?: string }[];
    };

    expect(manifest.commands.find((command) => command.name === "menu-bar")?.interval).toBe("1m");
  });

  it("resets the elapsed-time baseline after every server refresh", () => {
    const source = readSource("menu-bar.tsx");

    expect(source).toMatch(
      /setElapsedMs\(task \? Object\.values\(task\.timeSpentOnDay\).*: 0\);\s+startTimeRef\.current = Date\.now\(\);/s,
    );
  });
});

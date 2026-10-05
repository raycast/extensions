import { describe, expect, it } from "vitest";
import { buildAddTaskArgs, parseWorkspaces, validateTaskForm } from "./lib";

describe("parseWorkspaces", () => {
  it("parses key and quoted name from each line", () => {
    const output = 'default name="default"\nwork name="Work Stuff"';
    expect(parseWorkspaces(output)).toEqual([
      { key: "default", name: "default" },
      { key: "work", name: "Work Stuff" },
    ]);
  });

  it("falls back to the key when name is missing", () => {
    expect(parseWorkspaces("default")).toEqual([{ key: "default", name: "default" }]);
  });

  it("ignores blank lines and surrounding whitespace", () => {
    const output = '  default name="default"  \n\n\n  work name="work"\n';
    expect(parseWorkspaces(output)).toEqual([
      { key: "default", name: "default" },
      { key: "work", name: "work" },
    ]);
  });

  it("returns an empty array for empty output", () => {
    expect(parseWorkspaces("")).toEqual([]);
  });
});

describe("validateTaskForm", () => {
  it("requires a non-blank title", () => {
    expect(validateTaskForm({ title: "  ", workspaceKey: "ws", projectKey: "proj" })).toBe("Title is required");
  });

  it("requires a workspace and project", () => {
    expect(validateTaskForm({ title: "Task", workspaceKey: "", projectKey: "proj" })).toBe(
      "Workspace and project are required",
    );
    expect(validateTaskForm({ title: "Task", workspaceKey: "ws", projectKey: "" })).toBe(
      "Workspace and project are required",
    );
  });

  it("returns null when the form is valid", () => {
    expect(validateTaskForm({ title: "Task", workspaceKey: "ws", projectKey: "proj" })).toBeNull();
  });
});

describe("buildAddTaskArgs", () => {
  it("builds args without a description flag when description is blank", () => {
    expect(
      buildAddTaskArgs({ title: "Task", workspaceKey: "ws", projectKey: "proj", status: "todo", description: "  " }),
    ).toEqual(["add", "Task", "--workspace", "ws", "--project", "proj", "--status", "todo"]);
  });

  it("appends the description flag when a description is provided", () => {
    expect(
      buildAddTaskArgs({
        title: "Task",
        workspaceKey: "ws",
        projectKey: "proj",
        status: "todo",
        description: "Some notes",
      }),
    ).toEqual([
      "add",
      "Task",
      "--workspace",
      "ws",
      "--project",
      "proj",
      "--status",
      "todo",
      "--description",
      "Some notes",
    ]);
  });

  it("passes the title through untouched, without shell interpolation", () => {
    const args = buildAddTaskArgs({
      title: "Fix `rm -rf /` in docs",
      workspaceKey: "ws",
      projectKey: "proj",
      status: "todo",
      description: "",
    });
    expect(args[1]).toBe("Fix `rm -rf /` in docs");
  });
});

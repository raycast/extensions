import { describe, expect, test } from "vitest";

import { selectInbox, searchTasks } from "./taskSelectors";
import type { TaskViewQuery } from "./viewQuery";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";

const searchQuery = (overrides: Partial<TaskViewQuery> = {}): TaskViewQuery => ({
  view: "search",
  status: "open",
  ...overrides,
});

describe("selectInbox", () => {
  test("resolves Inbox only by project kind and retains undated tasks", () => {
    const inboxTask = taskFixture({ id: "inbox-undated" });
    const projectTask = taskFixture({
      id: "project-task",
      projectId: workProject.id,
      projectName: workProject.name,
    });

    expect(selectInbox([projectTask, inboxTask], [workProject, inboxProject], "open").map((task) => task.id)).toEqual([
      "inbox-undated",
    ]);
  });

  test("returns no tasks when no project is explicitly marked as Inbox", () => {
    const arbitraryFirstProject = { ...workProject, id: "first-project" };
    const arbitraryTask = taskFixture({
      id: "arbitrary-task",
      projectId: arbitraryFirstProject.id,
      projectName: arbitraryFirstProject.name,
    });

    expect(selectInbox([arbitraryTask], [arbitraryFirstProject], "open")).toEqual([]);
  });

  test.each([
    ["open", ["open"]],
    ["completed", ["completed"]],
    ["all", ["open", "completed"]],
  ] as const)("applies the %s status scope", (status, expectedIds) => {
    const tasks = [taskFixture({ id: "open" }), taskFixture({ id: "completed", status: "completed" })];

    expect(selectInbox(tasks, [inboxProject], status).map((task) => task.id)).toEqual(expectedIds);
  });
});

describe("searchTasks", () => {
  test("retains undated tasks and matches title, content, description, tag, and project name case-insensitively", () => {
    const tasks = [
      taskFixture({ id: "title", title: "Quarterly Needle" }),
      taskFixture({ id: "content", content: "A needle in content" }),
      taskFixture({ id: "description", description: "Description NEEDLE" }),
      taskFixture({ id: "tag", tags: ["needle-tag"] }),
      taskFixture({ id: "project", projectName: "Needle Project" }),
      taskFixture({ id: "miss", title: "Unrelated" }),
    ];

    expect(searchTasks(tasks, searchQuery({ searchText: "  nEeDlE  " })).map((task) => task.id)).toEqual([
      "title",
      "content",
      "description",
      "tag",
      "project",
    ]);
  });

  test("uses Unicode caseless matching for Greek final sigma", () => {
    const tasks = [taskFixture({ id: "greek", title: "ΟΣ" })];

    expect(searchTasks(tasks, searchQuery({ searchText: "οσ" })).map((task) => task.id)).toEqual(["greek"]);
  });

  test("matches canonically equivalent composed and decomposed text", () => {
    const tasks = [taskFixture({ id: "accent", content: "Café" })];

    expect(searchTasks(tasks, searchQuery({ searchText: "Cafe\u0301" })).map((task) => task.id)).toEqual(["accent"]);
  });

  test("uses full case-fold equivalence for sharp s", () => {
    const tasks = [taskFixture({ id: "sharp-s", projectName: "Straße" })];

    expect(searchTasks(tasks, searchQuery({ searchText: "STRASSE" })).map((task) => task.id)).toEqual(["sharp-s"]);
  });

  test.each([
    ["open", ["open"]],
    ["completed", ["completed"]],
    ["all", ["open", "completed"]],
  ] as const)("applies the %s status scope", (status, expectedIds) => {
    const tasks = [
      taskFixture({ id: "open", title: "Matched" }),
      taskFixture({ id: "completed", title: "Matched", status: "completed" }),
    ];

    expect(searchTasks(tasks, searchQuery({ status, searchText: "matched" })).map((task) => task.id)).toEqual(
      expectedIds
    );
  });

  test("filters by exact project ID before applying local text search", () => {
    const tasks = [
      taskFixture({ id: "inbox", title: "Matched" }),
      taskFixture({
        id: "work",
        title: "Matched",
        projectId: workProject.id,
        projectName: workProject.name,
      }),
    ];

    expect(
      searchTasks(tasks, searchQuery({ projectId: workProject.id, searchText: "matched" })).map((task) => task.id)
    ).toEqual(["work"]);
  });

  test("treats missing or whitespace-only text as an unfiltered local query", () => {
    const tasks = [taskFixture({ id: "one" }), taskFixture({ id: "two" })];

    expect(searchTasks(tasks, searchQuery()).map((task) => task.id)).toEqual(["one", "two"]);
    expect(searchTasks(tasks, searchQuery({ searchText: "   " })).map((task) => task.id)).toEqual(["one", "two"]);
  });
});

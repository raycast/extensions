import { describe, expect, it } from "vitest";

import type { TaskReadModel } from "../application/TickTickService";
import type { TaskSection } from "../application/viewQuery";
import { AuthenticationError, NetworkError, NotFoundError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";
import {
  applyCombinedTaskFilterSelection,
  buildCombinedTaskFilter,
  buildTaskListModel,
  filterTaskSections,
  getTaskStatusAction,
  resolveTaskListFilters,
  type TaskListFilters,
} from "./taskListModel";

const fullCapabilities: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: true,
};

const legacyCapabilities: BackendCapabilities = {
  create: false,
  update: false,
  complete: true,
  reopen: false,
  move: false,
  completedQuery: false,
  inboxQuery: false,
  exactTaskLink: true,
};

function section(id: string, title: string, tasks: Task[]): TaskSection {
  return { id, title, tasks };
}

function readModel(overrides: Partial<TaskReadModel> = {}): TaskReadModel {
  const tasks = overrides.tasks ?? [taskFixture({ id: "open-task" })];
  return {
    projects: [inboxProject, workProject],
    tasks,
    sections: overrides.sections ?? [section("search", "Tasks", tasks)],
    freshness: "fresh",
    fetchedAt: 1_000,
    isPartial: false,
    failedProjectIds: [],
    ...overrides,
  };
}

function build(
  overrides: Partial<Parameters<typeof buildTaskListModel>[0]> = {}
): ReturnType<typeof buildTaskListModel> {
  return buildTaskListModel({
    read: { data: readModel(), isLoading: false, isRefreshing: false },
    filtersReady: true,
    requestedFilters: { searchText: "", status: "open" },
    emptyTitle: "No Matching Tasks",
    capabilities: fullCapabilities,
    ...overrides,
  });
}

describe("buildTaskListModel", () => {
  it("renders loading rather than an empty state before the first snapshot exists", () => {
    const model = build({ read: { isLoading: false, isRefreshing: false } });

    expect(model.content).toEqual({ kind: "loading" });
    expect(model.isBusy).toBe(false);
  });

  it("preserves a remembered project until an authoritative loaded catalog validates it", () => {
    const requestedFilters = { searchText: "needle", projectId: workProject.id, status: "open" } as const;
    const cold = build({
      read: { isLoading: true, isRefreshing: false },
      filtersReady: true,
      requestedFilters,
    });
    const loadedValid = build({
      read: { data: readModel({ projects: [inboxProject, workProject] }), isLoading: false, isRefreshing: false },
      requestedFilters,
    });
    const loadedMissing = build({
      read: { data: readModel({ projects: [inboxProject] }), isLoading: false, isRefreshing: false },
      requestedFilters,
    });
    const loadedClosed = build({
      read: {
        data: readModel({ projects: [{ ...workProject, closed: true }] }),
        isLoading: false,
        isRefreshing: false,
      },
      requestedFilters,
    });

    expect(cold.content).toEqual({ kind: "loading" });
    expect(cold.filters.projectId).toBe(workProject.id);
    expect(loadedValid.filters.projectId).toBe(workProject.id);
    expect(loadedMissing.filters.projectId).toBeUndefined();
    expect(loadedClosed.filters.projectId).toBeUndefined();
  });

  it("keeps loaded data behind loading until remembered filters are ready", () => {
    const model = build({ filtersReady: false });

    expect(model.content).toEqual({ kind: "loading" });
    expect(model.isBusy).toBe(true);
  });

  it("uses the command's exact empty title for an empty loaded snapshot", () => {
    const data = readModel({ tasks: [], sections: [] });
    const model = build({
      read: { data, isLoading: false, isRefreshing: false },
      emptyTitle: "No Tasks Today",
    });

    expect(model.content).toEqual({ kind: "empty", title: "No Tasks Today" });
  });

  it("keeps cached results visible while a refresh is in progress", () => {
    const model = build({
      read: { data: readModel(), isLoading: false, isRefreshing: true },
    });

    expect(model.content.kind).toBe("results");
    expect(model.isBusy).toBe(true);
  });

  it("preserves stale freshness and its warning alongside results", () => {
    const warning = "Refreshing TickTick. Showing cached data from 2 minutes ago.";
    const data = readModel({ freshness: "stale", warning });
    const model = build({ read: { data, isLoading: false, isRefreshing: true } });

    expect(model.content.kind).toBe("results");
    expect(model.health).toEqual({ freshness: "stale", isPartial: false, warning });
  });

  it("preserves partial state and its warning alongside results", () => {
    const warning = "Some projects could not be refreshed.";
    const data = readModel({ isPartial: true, failedProjectIds: [workProject.id], warning });
    const model = build({ read: { data, isLoading: false, isRefreshing: false } });

    expect(model.content.kind).toBe("results");
    expect(model.health).toEqual({ freshness: "fresh", isPartial: true, warning });
  });

  it("keeps stale and partial health dimensions simultaneously", () => {
    const warning = "Warning: TickTick data is stale. Some projects could not be refreshed.";
    const data = readModel({
      freshness: "stale",
      isPartial: true,
      failedProjectIds: [workProject.id],
      warning,
    });
    const model = build({ read: { data, isLoading: false, isRefreshing: false } });

    expect(model.health).toMatchObject({ freshness: "stale", isPartial: true, warning });
  });

  it("retains data for retainable read errors but replaces it for non-retainable errors", () => {
    const data = readModel();
    const retained = build({
      read: { data, error: new NetworkError("private network details"), isLoading: false, isRefreshing: false },
    });
    const replaced = build({
      read: { data, error: new NotFoundError("private task details"), isLoading: false, isRefreshing: false },
    });

    expect(retained.content.kind).toBe("results");
    expect(retained.health.readError).toMatchObject({ kind: "network", retainData: true });
    expect(replaced.content).toMatchObject({ kind: "error", error: { kind: "not-found", retainData: false } });
  });

  it("presents authentication, offline, and unknown initial failures distinctly", () => {
    const failures = [
      new AuthenticationError("private auth details"),
      new NetworkError("private network details"),
      new Error("private unknown details"),
    ];

    expect(
      failures.map((error) => {
        const content = build({ read: { error, isLoading: false, isRefreshing: false } }).content;
        return content.kind === "error" ? content.error.kind : "unexpected";
      })
    ).toEqual(["authentication", "network", "unknown"]);
  });

  it("preserves Today section and task order while removing only emptied sections", () => {
    const overdueOne = taskFixture({ id: "overdue-one", title: "Keep overdue" });
    const overdueTwo = taskFixture({ id: "overdue-two", title: "Drop overdue" });
    const todayOne = taskFixture({ id: "today-one", title: "Keep today one" });
    const todayTwo = taskFixture({ id: "today-two", title: "Keep today two" });
    const sections = [
      section("overdue", "Overdue", [overdueOne, overdueTwo]),
      section("today", "Today", [todayOne, todayTwo]),
      section("later", "Later", [taskFixture({ id: "later", title: "Drop later" })]),
    ];

    const filtered = filterTaskSections(sections, {
      searchText: "keep",
      status: "open",
    });

    expect(filtered.map((value) => [value.id, value.tasks.map((task) => task.id)])).toEqual([
      ["overdue", ["overdue-one"]],
      ["today", ["today-one", "today-two"]],
    ]);
  });

  it("preserves Next 7 Days calendar-section order", () => {
    const sections = [
      section("2026-08-14", "Today", [taskFixture({ id: "day-zero", title: "Matched" })]),
      section("2026-08-16", "Sunday", [taskFixture({ id: "day-two", title: "Matched" })]),
      section("2026-08-20", "Thursday", [taskFixture({ id: "day-six", title: "Matched" })]),
    ];

    const filtered = filterTaskSections(sections, { searchText: "matched", status: "open" });

    expect(filtered.map((value) => value.id)).toEqual(["2026-08-14", "2026-08-16", "2026-08-20"]);
  });

  it("filters locally across title, content, description, tags, and project name", () => {
    const tasks = [
      taskFixture({ id: "title", title: "Needle title" }),
      taskFixture({ id: "content", content: "Needle content" }),
      taskFixture({ id: "description", description: "Needle description" }),
      taskFixture({ id: "tag", tags: ["needle-tag"] }),
      taskFixture({ id: "project", projectName: "Needle Project" }),
      taskFixture({ id: "miss", title: "Unrelated" }),
    ];

    const filtered = filterTaskSections([section("search", "Tasks", tasks)], {
      searchText: "  NEEDLE  ",
      status: "open",
    });

    expect(filtered[0].tasks.map((task) => task.id)).toEqual(["title", "content", "description", "tag", "project"]);
  });

  it("applies an exact project filter across every section", () => {
    const inbox = taskFixture({ id: "same", projectId: inboxProject.id });
    const work = taskFixture({ id: "same", projectId: workProject.id, projectName: workProject.name });
    const filtered = filterTaskSections(
      [section("first", "First", [inbox, work]), section("second", "Second", [work, inbox])],
      { searchText: "", projectId: workProject.id, status: "open" }
    );

    expect(filtered.map((value) => value.tasks.map((task) => [task.projectId, task.id]))).toEqual([
      [[workProject.id, "same"]],
      [[workProject.id, "same"]],
    ]);
  });

  it("applies Open, Completed, and All status filters", () => {
    const tasks = [taskFixture({ id: "open", status: "open" }), taskFixture({ id: "completed", status: "completed" })];
    const sections = [section("search", "Tasks", tasks)];

    expect(filterTaskSections(sections, { searchText: "", status: "open" })[0].tasks.map((task) => task.id)).toEqual([
      "open",
    ]);
    expect(
      filterTaskSections(sections, { searchText: "", status: "completed" })[0].tasks.map((task) => task.id)
    ).toEqual(["completed"]);
    expect(filterTaskSections(sections, { searchText: "", status: "all" })[0].tasks.map((task) => task.id)).toEqual([
      "open",
      "completed",
    ]);
  });

  it("does not mutate source models, sections, or task arrays", () => {
    const tasks = [taskFixture({ id: "one", title: "Matched" }), taskFixture({ id: "two", title: "Miss" })];
    const sections = [section("search", "Tasks", tasks)];
    const before = structuredClone(sections);

    const filtered = filterTaskSections(sections, { searchText: "matched", status: "open" });

    expect(sections).toEqual(before);
    expect(filtered).not.toBe(sections);
    expect(filtered[0]).not.toBe(sections[0]);
    expect(filtered[0].tasks).not.toBe(tasks);
  });

  it("exposes Reopen only for completed tasks when the backend supports it", () => {
    const completed = taskFixture({ status: "completed" });

    expect(getTaskStatusAction(completed, fullCapabilities)).toBe("reopen");
    expect(getTaskStatusAction(completed, legacyCapabilities)).toBe("none");
  });

  it("exposes Complete only for open tasks when the backend supports it", () => {
    const open = taskFixture({ status: "open" });

    expect(getTaskStatusAction(open, fullCapabilities)).toBe("complete");
    expect(getTaskStatusAction(open, { complete: false, reopen: true })).toBe("none");
  });

  it("coerces legacy filters to Open and never exposes completed results or status choices", () => {
    const untrustedPersisted: TaskListFilters = { searchText: "", status: "completed" };
    const filters = resolveTaskListFilters(untrustedPersisted, [inboxProject, workProject], legacyCapabilities);
    const dropdown = buildCombinedTaskFilter(filters, [inboxProject, workProject], false);
    const untrustedDropdown = buildCombinedTaskFilter(untrustedPersisted, [inboxProject, workProject], false);
    const workOption = untrustedDropdown.projectOptions.find(
      (option) => option.selection?.projectId === workProject.id
    )!;
    const tasks = [taskFixture({ id: "open" }), taskFixture({ id: "completed", status: "completed" })];

    expect(filters.status).toBe("open");
    expect(dropdown.statusOptions.map((option) => option.title)).toEqual(["Open"]);
    expect(untrustedDropdown.canonicalFilters).toEqual({ searchText: "", status: "open" });
    expect(applyCombinedTaskFilterSelection(untrustedPersisted, untrustedDropdown, untrustedDropdown.value)).toEqual({
      searchText: "",
      status: "open",
    });
    expect(applyCombinedTaskFilterSelection(untrustedPersisted, untrustedDropdown, "filter:unknown")).toEqual({
      searchText: "",
      status: "open",
    });
    expect(applyCombinedTaskFilterSelection(untrustedPersisted, untrustedDropdown, workOption.value).status).toBe(
      "open"
    );
    expect(filterTaskSections([section("search", "Tasks", tasks)], filters)[0].tasks.map((task) => task.id)).toEqual([
      "open",
    ]);
  });

  it("resets unknown, closed, and blank project filters to All Projects", () => {
    const closed: Project = { id: "closed", name: "Closed", kind: "project", closed: true };
    const blank: Project = { id: "   ", name: "Blank", kind: "project", closed: false };
    const projects = [inboxProject, closed, blank];

    for (const projectId of ["missing", closed.id, blank.id]) {
      expect(
        resolveTaskListFilters({ projectId, status: "open" }, projects, fullCapabilities).projectId
      ).toBeUndefined();
    }
  });

  it("builds the exact combined-filter summary", () => {
    const dropdown = buildCombinedTaskFilter(
      { searchText: "", projectId: workProject.id, status: "completed" },
      [inboxProject, workProject],
      true
    );

    expect(dropdown.value).toBe("filter:current");
    expect(dropdown.summary).toBe("Completed · Work Projects");
    expect(dropdown.current).toEqual({ value: "filter:current", title: "Completed · Work Projects" });
  });

  it("keeps dropdown sections ordered and omits closed, blank, and duplicate projects", () => {
    const closed: Project = { id: "closed", name: "Closed", kind: "project", closed: true };
    const blank: Project = { id: " ", name: "Blank", kind: "project", closed: false };
    const duplicate = { ...workProject, name: "Duplicate Work" };
    const dropdown = buildCombinedTaskFilter(
      { searchText: "", status: "open" },
      [inboxProject, workProject, closed, blank, duplicate],
      true
    );

    expect(dropdown.statusOptions.map((option) => option.title)).toEqual(["Open", "Completed", "All"]);
    expect(dropdown.projectOptions.map((option) => option.title)).toEqual(["All Projects", "Inbox", "Work Projects"]);
  });

  it("changes status while preserving project and search text", () => {
    const current: TaskListFilters = { searchText: "needle", projectId: workProject.id, status: "open" };
    const dropdown = buildCombinedTaskFilter(current, [inboxProject, workProject], true);
    const completed = dropdown.statusOptions.find((option) => option.selection?.status === "completed")!;

    expect(applyCombinedTaskFilterSelection(current, dropdown, completed.value)).toEqual({
      searchText: "needle",
      projectId: workProject.id,
      status: "completed",
    });
  });

  it("removes a closed project before applying a status selection", () => {
    const closedProject = { ...workProject, closed: true };
    const current: TaskListFilters = { searchText: "needle", projectId: closedProject.id, status: "open" };
    const dropdown = buildCombinedTaskFilter(current, [inboxProject, closedProject], true);
    const completed = dropdown.statusOptions.find((option) => option.selection?.status === "completed")!;

    expect(dropdown.canonicalFilters).toEqual({ searchText: "needle", status: "open" });
    expect(applyCombinedTaskFilterSelection(current, dropdown, completed.value)).toEqual({
      searchText: "needle",
      status: "completed",
    });
  });

  it("changes project while preserving status and search text", () => {
    const current: TaskListFilters = { searchText: "needle", status: "completed" };
    const dropdown = buildCombinedTaskFilter(current, [inboxProject, workProject], true);
    const work = dropdown.projectOptions.find((option) => option.selection?.projectId === workProject.id)!;

    expect(applyCombinedTaskFilterSelection(current, dropdown, work.value)).toEqual({
      searchText: "needle",
      projectId: workProject.id,
      status: "completed",
    });
  });

  it("treats the current and unknown dropdown values as no-ops", () => {
    const current: TaskListFilters = { searchText: "needle", projectId: workProject.id, status: "all" };
    const dropdown = buildCombinedTaskFilter(current, [inboxProject, workProject], true);

    expect(applyCombinedTaskFilterSelection(current, dropdown, dropdown.value)).toBe(current);
    expect(applyCombinedTaskFilterSelection(current, dropdown, "filter:unknown")).toBe(current);
  });

  it("uses opaque unique option values for project IDs resembling control values", () => {
    const projects: Project[] = ["all", "filter:current", "filter:status:open"].map((id) => ({
      id,
      name: `Project ${id}`,
      kind: "project",
      closed: false,
    }));
    const current: TaskListFilters = { searchText: "", status: "open" };
    const dropdown = buildCombinedTaskFilter(current, projects, true);
    const values = [dropdown.current, ...dropdown.statusOptions, ...dropdown.projectOptions].map(
      (option) => option.value
    );

    expect(new Set(values)).toHaveLength(values.length);
    for (const project of projects) {
      const option = dropdown.projectOptions.find((candidate) => candidate.selection?.projectId === project.id)!;
      expect(applyCombinedTaskFilterSelection(current, dropdown, option.value).projectId).toBe(project.id);
    }
  });

  it("rebuilds several filter edits from one stable snapshot without mutation or external operations", () => {
    const open = taskFixture({ id: "open", title: "Needle" });
    const completed = taskFixture({
      id: "completed",
      title: "Needle",
      status: "completed",
      projectId: workProject.id,
      projectName: workProject.name,
    });
    const data = readModel({ tasks: [open, completed], sections: [section("search", "Tasks", [open, completed])] });
    const before = structuredClone(data);

    const ids = [
      build({ read: { data, isLoading: false, isRefreshing: false } }),
      build({
        read: { data, isLoading: false, isRefreshing: false },
        requestedFilters: { searchText: "needle", status: "all" },
      }),
      build({
        read: { data, isLoading: false, isRefreshing: false },
        requestedFilters: { searchText: "needle", projectId: workProject.id, status: "completed" },
      }),
    ].map((model) =>
      model.content.kind === "results"
        ? model.content.sections.flatMap((value) => value.items.map((item) => item.task.id))
        : []
    );

    expect(ids).toEqual([["open"], ["open", "completed"], ["completed"]]);
    expect(data).toEqual(before);
  });
});

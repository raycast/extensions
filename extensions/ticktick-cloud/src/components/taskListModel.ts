import { presentError, type ErrorPresentation } from "../application/errorPresentation";
import { searchTasks } from "../application/taskSelectors";
import type { TaskReadModel } from "../application/TickTickService";
import type { TaskSection, TaskViewQuery } from "../application/viewQuery";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";

export interface TaskListFilters {
  readonly searchText: string;
  readonly projectId?: string;
  readonly status: TaskViewQuery["status"];
}

export interface TaskListReadState {
  readonly data?: TaskReadModel;
  readonly error?: unknown;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
}

export type TaskStatusAction = "complete" | "reopen" | "none";

export interface TaskListItemModel {
  readonly task: Task;
  readonly statusAction: TaskStatusAction;
}

export interface TaskListSectionModel {
  readonly id: string;
  readonly title: string;
  readonly items: readonly TaskListItemModel[];
}

export type TaskListContent =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "error"; error: ErrorPresentation }>
  | Readonly<{ kind: "empty"; title: string }>
  | Readonly<{ kind: "results"; sections: readonly TaskListSectionModel[] }>;

export interface TaskListHealth {
  readonly freshness?: "fresh" | "stale";
  readonly isPartial: boolean;
  readonly warning?: string;
  readonly readError?: ErrorPresentation;
}

export interface TaskListModel {
  readonly content: TaskListContent;
  readonly filters: TaskListFilters;
  readonly isBusy: boolean;
  readonly health: TaskListHealth;
}

export interface RequestedTaskListFilters {
  readonly searchText?: string;
  readonly projectId?: unknown;
  readonly status?: unknown;
}

export type CombinedFilterSelection =
  | Readonly<{
      kind: "status";
      status: TaskViewQuery["status"];
      projectId?: never;
    }>
  | Readonly<{
      kind: "project";
      projectId?: string;
      status?: never;
    }>;

export interface CombinedFilterOption {
  readonly value: string;
  readonly title: string;
  readonly selection?: CombinedFilterSelection;
}

export interface CombinedTaskFilterModel {
  readonly value: "filter:current";
  readonly summary: string;
  readonly current: CombinedFilterOption;
  readonly canonicalFilters: TaskListFilters;
  readonly statusOptions: readonly CombinedFilterOption[];
  readonly projectOptions: readonly CombinedFilterOption[];
}

export function resolveTaskListFilters(
  requested: RequestedTaskListFilters,
  projects: readonly Project[],
  capabilities: Pick<BackendCapabilities, "completedQuery">,
  catalogAuthoritative = true
): TaskListFilters {
  const available = availableProjects(projects);
  const requestedProjectId =
    typeof requested.projectId === "string" && requested.projectId.trim().length > 0 ? requested.projectId : undefined;
  const projectId =
    requestedProjectId !== undefined &&
    (!catalogAuthoritative || available.some((project) => project.id === requestedProjectId))
      ? requestedProjectId
      : undefined;
  const status =
    isTaskStatus(requested.status) && (capabilities.completedQuery || requested.status === "open")
      ? requested.status
      : "open";

  return {
    searchText: requested.searchText ?? "",
    ...(projectId === undefined ? {} : { projectId }),
    status,
  };
}

export function filterTaskSections(sections: readonly TaskSection[], filters: TaskListFilters): TaskSection[] {
  const query: TaskViewQuery = {
    view: "search",
    status: filters.status,
    ...(filters.searchText ? { searchText: filters.searchText } : {}),
    ...(filters.projectId === undefined ? {} : { projectId: filters.projectId }),
  };

  return sections.flatMap((section): TaskSection[] => {
    const tasks = searchTasks(section.tasks, query);
    return tasks.length === 0 ? [] : [{ id: section.id, title: section.title, tasks }];
  });
}

export function getTaskStatusAction(
  task: Task,
  capabilities: Pick<BackendCapabilities, "complete" | "reopen">
): TaskStatusAction {
  if (task.status === "completed") return capabilities.reopen ? "reopen" : "none";
  return capabilities.complete ? "complete" : "none";
}

export function buildTaskListModel(
  input: Readonly<{
    read: TaskListReadState;
    filtersReady: boolean;
    requestedFilters: RequestedTaskListFilters;
    emptyTitle: string;
    capabilities: Pick<BackendCapabilities, "complete" | "reopen" | "completedQuery">;
  }>
): TaskListModel {
  const filters = resolveTaskListFilters(
    input.requestedFilters,
    input.read.data?.projects ?? [],
    input.capabilities,
    input.read.data !== undefined
  );
  const error = input.read.error === undefined ? undefined : presentError(input.read.error, "read");
  const health = createHealth(input.read.data, error);
  const isBusy = !input.filtersReady || input.read.isLoading || input.read.isRefreshing;

  if (!input.filtersReady) return { content: { kind: "loading" }, filters, isBusy, health };
  if (!input.read.data) {
    return {
      content: error ? { kind: "error", error } : { kind: "loading" },
      filters,
      isBusy,
      health,
    };
  }
  if (error && !error.retainData) {
    return { content: { kind: "error", error }, filters, isBusy, health };
  }

  const sections = filterTaskSections(input.read.data.sections, filters).map(
    (section): TaskListSectionModel => ({
      id: section.id,
      title: section.title,
      items: section.tasks.map((task) => ({
        task,
        statusAction: getTaskStatusAction(task, input.capabilities),
      })),
    })
  );
  const content: TaskListContent =
    sections.length === 0 ? { kind: "empty", title: input.emptyTitle } : { kind: "results", sections };
  return { content, filters, isBusy, health };
}

export function buildCombinedTaskFilter(
  filters: TaskListFilters,
  projects: readonly Project[],
  completedQuery: boolean
): CombinedTaskFilterModel {
  const available = availableProjects(projects);
  const canonicalFilters = resolveTaskListFilters(filters, available, { completedQuery });
  const statuses: readonly TaskViewQuery["status"][] = completedQuery ? ["open", "completed", "all"] : ["open"];
  const activeProject = available.find((project) => project.id === canonicalFilters.projectId);
  const summary = `${statusTitle(canonicalFilters.status)} · ${activeProject?.name || "All Projects"}`;
  const current: CombinedFilterOption = { value: "filter:current", title: summary };

  return {
    value: "filter:current",
    summary,
    current,
    canonicalFilters,
    statusOptions: statuses.map((status, index) => ({
      value: `filter:status:${index}`,
      title: statusTitle(status),
      selection: { kind: "status", status },
    })),
    projectOptions: [
      {
        value: "filter:project:all",
        title: "All Projects",
        selection: { kind: "project" },
      },
      ...available.map(
        (project, index): CombinedFilterOption => ({
          value: `filter:project:${index}`,
          title: project.name || "Untitled List",
          selection: { kind: "project", projectId: project.id },
        })
      ),
    ],
  };
}

export function applyCombinedTaskFilterSelection(
  current: TaskListFilters,
  dropdown: CombinedTaskFilterModel,
  selectedValue: string
): TaskListFilters {
  const canonical = canonicalizeAgainstDropdown(current, dropdown);
  const option = [...dropdown.statusOptions, ...dropdown.projectOptions].find(
    (candidate) => candidate.value === selectedValue
  );
  const selection = option?.selection;
  if (!selection) return sameFilters(current, canonical) ? current : canonical;

  if (selection.kind === "status") return { ...canonical, status: selection.status };
  if (selection.projectId === undefined) {
    return { searchText: canonical.searchText, status: canonical.status };
  }
  return { ...canonical, projectId: selection.projectId };
}

function canonicalizeAgainstDropdown(current: TaskListFilters, dropdown: CombinedTaskFilterModel): TaskListFilters {
  const status = dropdown.statusOptions.some(
    (option) => option.selection?.kind === "status" && option.selection.status === current.status
  )
    ? current.status
    : "open";
  const projectId = dropdown.projectOptions.some(
    (option) => option.selection?.kind === "project" && option.selection.projectId === current.projectId
  )
    ? current.projectId
    : undefined;

  return {
    searchText: current.searchText,
    ...(projectId === undefined ? {} : { projectId }),
    status,
  };
}

function sameFilters(left: TaskListFilters, right: TaskListFilters): boolean {
  return left.searchText === right.searchText && left.projectId === right.projectId && left.status === right.status;
}

function createHealth(data: TaskReadModel | undefined, error: ErrorPresentation | undefined): TaskListHealth {
  if (!data) return { isPartial: false };

  return {
    freshness: data.freshness,
    isPartial: data.isPartial,
    ...(data.warning === undefined ? {} : { warning: data.warning }),
    ...(error?.retainData ? { readError: error } : {}),
  };
}

function availableProjects(projects: readonly Project[]): Project[] {
  const seen = new Set<string>();
  return projects.filter((project) => {
    if (project.closed || project.id.trim().length === 0 || seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

function isTaskStatus(value: unknown): value is TaskViewQuery["status"] {
  return value === "open" || value === "completed" || value === "all";
}

function statusTitle(status: TaskViewQuery["status"]): string {
  switch (status) {
    case "open":
      return "Open";
    case "completed":
      return "Completed";
    case "all":
      return "All";
  }
}

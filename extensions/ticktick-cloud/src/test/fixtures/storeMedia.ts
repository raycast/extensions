import { selectToday } from "../../application/taskSections";
import type { TaskReadModel } from "../../application/TickTickService";
import type { Project } from "../../domain/project";
import type { Task } from "../../domain/task";
import type { BackendCapabilities } from "../../infrastructure/backend/TickTickBackend";
import { TODAY_COMMAND, SEARCH_COMMAND, type TaskCommandConfig } from "../../commands/taskCommandConfigs";
import {
  availableMoveProjects,
  buildCreateTaskFormValues,
  buildEditTaskFormBaseline,
  type TaskDateSemantics,
  type TaskFormValues,
} from "../../components/taskFormModel";
import {
  buildCombinedTaskFilter,
  buildTaskListModel,
  type CombinedTaskFilterModel,
  type TaskListModel,
} from "../../components/taskListModel";
import { resolveTaskActions, type TaskActionDescriptor } from "../../components/taskActions";

export const STORE_MEDIA_TIME_ZONE = "America/Denver";
export const STORE_MEDIA_NOW_ISO = "2026-08-14T16:00:00.000Z";

const UNSAFE_FIXTURE_MESSAGE = "Store media fixtures contain unsafe data.";
const IDENTIFIER_KEY_PATTERN = /^(?:id|[A-Za-z][A-Za-z\d]*Ids?)$/u;
const UNSAFE_STRING_PATTERN =
  /(?:\p{C}|\b(?:https?|ftp|file|mailto|data|javascript|ticktick):|\bwww\.|[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}|\b(?:api[-_\s]?key|api[-_\s]?token|access[-_\s]?token|refresh[-_\s]?token|bearer|password|credential|secret|authorization|account)\b)/iu;

export interface StoreMediaTaskListVisibleCopy {
  readonly searchBarPlaceholder: string;
  readonly filterSummary?: string;
  readonly sectionTitles: readonly string[];
  readonly selectedTaskTitle: string;
  readonly actionTitles: readonly string[];
}

export interface StoreMediaTaskListScenario {
  readonly id: "store-demo-today" | "store-demo-search-completed";
  readonly order: 1 | 2;
  readonly title: "Today" | "Search Completed Tasks";
  readonly kind: "task-list";
  readonly command: Readonly<TaskCommandConfig>;
  readonly projects: readonly Project[];
  readonly model: TaskListModel;
  readonly filter?: CombinedTaskFilterModel;
  readonly selectedTaskActions: readonly TaskActionDescriptor[];
  readonly visibleCopy: StoreMediaTaskListVisibleCopy;
}

export interface StoreMediaTaskFormState {
  readonly mode: "create" | "edit";
  readonly submitTitle: "Create Task" | "Save Task";
  readonly values: TaskFormValues;
  readonly dateSemantics: TaskDateSemantics;
}

export interface StoreMediaTaskFormScenario {
  readonly id: "store-demo-add-edit";
  readonly order: 3;
  readonly title: "Add or Edit a Task";
  readonly kind: "task-form";
  readonly component: "TaskForm";
  readonly projects: readonly Project[];
  readonly sourceTask: Task;
  readonly create: StoreMediaTaskFormState;
  readonly edit: StoreMediaTaskFormState;
  readonly visibleCopy: Readonly<{
    fieldTitles: readonly string[];
    allDayLabel: "All-day task";
    priorityTitles: readonly string[];
    createActionTitle: "Create Task";
    editActionTitle: "Save Task";
  }>;
}

export interface StoreMediaMoveScenario {
  readonly id: "store-demo-move";
  readonly order: 4;
  readonly title: "Move a Task";
  readonly kind: "move-list";
  readonly currentTask: Task;
  readonly projects: readonly Project[];
  readonly destinations: readonly Project[];
  readonly visibleCopy: Readonly<{
    searchBarPlaceholder: "Search lists...";
    emptyTitle: "No Other Lists";
    actionTitle: "Move Here";
  }>;
}

export type StoreMediaScenario = StoreMediaTaskListScenario | StoreMediaTaskFormScenario | StoreMediaMoveScenario;

const PROJECT_INPUT: Project[] = [
  { id: "store-demo-project-inbox", name: "Inbox", kind: "inbox", closed: false },
  { id: "store-demo-project-home", name: "Home Demo", kind: "project", closed: false },
  { id: "store-demo-project-community", name: "Community Demo", kind: "project", closed: false },
  { id: "store-demo-project-archived", name: "Archived Demo", kind: "project", closed: true },
];

export const STORE_MEDIA_PROJECTS: readonly Project[] = defineStoreMediaFixture(PROJECT_INPUT);

const CAPABILITIES: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: false,
};

const overdueTask = task({
  id: "store-demo-task-library-return",
  projectId: "store-demo-project-inbox",
  projectName: "Inbox",
  title: "Return library books",
  dueDate: "2026-08-13T18:00:00.000-06:00",
});

const todayTask = task({
  id: "store-demo-task-herbs",
  projectId: "store-demo-project-home",
  projectName: "Home Demo",
  title: "Water patio herbs",
  dueDate: "2026-08-14T17:00:00.000-06:00",
  priority: 3,
  tags: ["home"],
});

const completedSearchTask = task({
  id: "store-demo-task-library-display",
  projectId: "store-demo-project-community",
  projectName: "Community Demo",
  title: "Organize the community library display",
  status: "completed",
  priority: 1,
  tags: ["community"],
});

const openSearchTask = task({
  id: "store-demo-task-library-notes",
  projectId: "store-demo-project-community",
  projectName: "Community Demo",
  title: "Draft library display notes",
});

const editTask = task({
  id: "store-demo-task-edit",
  projectId: "store-demo-project-community",
  projectName: "Community Demo",
  title: "Prepare supplies for the park picnic",
  description: "Pack reusable plates and a picnic blanket.",
  startDate: "2026-08-15T09:00:00.000-06:00",
  dueDate: "2026-08-15T10:30:00.000-06:00",
  priority: 3,
  tags: ["outdoors", "weekend"],
});

const moveTask = task({
  id: "store-demo-task-move",
  projectId: "store-demo-project-home",
  projectName: "Home Demo",
  title: "Sort the shared activity supplies",
});

const todaySections = selectToday([overdueTask, todayTask], {
  now: new Date(STORE_MEDIA_NOW_ISO),
  timeZone: STORE_MEDIA_TIME_ZONE,
}).map((section) => ({ ...section, id: `store-demo-section-${section.id}` }));
const todayModel = listModel([overdueTask, todayTask], todaySections, { status: "open" }, "No Tasks Today");
const todayActions = resolveTaskActions(todayTask, CAPABILITIES, undefined);

const searchModel = listModel(
  [completedSearchTask, openSearchTask],
  [{ id: "store-demo-section-completed", title: "Completed", tasks: [completedSearchTask, openSearchTask] }],
  { searchText: "library", status: "completed" },
  "No Matching Tasks"
);
const searchFilter = buildCombinedTaskFilter(
  { searchText: "library", status: "completed" },
  STORE_MEDIA_PROJECTS,
  true
);
const searchActions = resolveTaskActions(completedSearchTask, CAPABILITIES, undefined);

const createValues = buildCreateTaskFormValues({
  projects: STORE_MEDIA_PROJECTS,
  rememberedProjectId: "store-demo-project-archived",
  defaultTitle: "Plan a weekend trail walk",
  defaultDate: new Date("2026-08-15T15:00:00.000Z"),
});
const createDateSemantics: TaskDateSemantics = {
  isFloating: true,
  timeZone: STORE_MEDIA_TIME_ZONE,
  uiTimeZone: STORE_MEDIA_TIME_ZONE,
};
const editBaseline = buildEditTaskFormBaseline(editTask, STORE_MEDIA_TIME_ZONE);
const moveDestinations = availableMoveProjects(STORE_MEDIA_PROJECTS, moveTask.projectId);

const SCENARIO_INPUT: readonly StoreMediaScenario[] = [
  {
    id: "store-demo-today",
    order: 1,
    title: "Today",
    kind: "task-list",
    command: TODAY_COMMAND,
    projects: STORE_MEDIA_PROJECTS,
    model: todayModel,
    selectedTaskActions: todayActions,
    visibleCopy: {
      searchBarPlaceholder: TODAY_COMMAND.placeholder,
      sectionTitles: resultSectionTitles(todayModel),
      selectedTaskTitle: todayTask.title,
      actionTitles: todayActions.map((action) => action.title),
    },
  },
  {
    id: "store-demo-search-completed",
    order: 2,
    title: "Search Completed Tasks",
    kind: "task-list",
    command: SEARCH_COMMAND,
    projects: STORE_MEDIA_PROJECTS,
    model: searchModel,
    filter: searchFilter,
    selectedTaskActions: searchActions,
    visibleCopy: {
      searchBarPlaceholder: SEARCH_COMMAND.placeholder,
      filterSummary: searchFilter.summary,
      sectionTitles: resultSectionTitles(searchModel),
      selectedTaskTitle: completedSearchTask.title,
      actionTitles: searchActions.map((action) => action.title),
    },
  },
  {
    id: "store-demo-add-edit",
    order: 3,
    title: "Add or Edit a Task",
    kind: "task-form",
    component: "TaskForm",
    projects: STORE_MEDIA_PROJECTS,
    sourceTask: editTask,
    create: {
      mode: "create",
      submitTitle: "Create Task",
      values: createValues,
      dateSemantics: createDateSemantics,
    },
    edit: {
      mode: "edit",
      submitTitle: "Save Task",
      values: editBaseline.values,
      dateSemantics: editBaseline.dateSemantics,
    },
    visibleCopy: {
      fieldTitles: ["Title", "List", "Description", "Start", "Due", "Date Type", "Priority", "Tags"],
      allDayLabel: "All-day task",
      priorityTitles: ["None", "Low", "Medium", "High"],
      createActionTitle: "Create Task",
      editActionTitle: "Save Task",
    },
  },
  {
    id: "store-demo-move",
    order: 4,
    title: "Move a Task",
    kind: "move-list",
    currentTask: moveTask,
    projects: STORE_MEDIA_PROJECTS,
    destinations: moveDestinations,
    visibleCopy: {
      searchBarPlaceholder: "Search lists...",
      emptyTitle: "No Other Lists",
      actionTitle: "Move Here",
    },
  },
];

export const STORE_MEDIA_SCENARIOS: readonly StoreMediaScenario[] = defineStoreMediaFixture(SCENARIO_INPUT);

export function defineStoreMediaFixture<Value>(input: Value): Value {
  try {
    return snapshotFixtureValue(input, undefined, new WeakSet<object>()) as Value;
  } catch {
    throw new Error(UNSAFE_FIXTURE_MESSAGE);
  }
}

function task(overrides: Partial<Task>): Task {
  return {
    id: "store-demo-task-default",
    projectId: "store-demo-project-inbox",
    projectName: "Inbox",
    title: "Plan a demo activity",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: true,
    timeZone: STORE_MEDIA_TIME_ZONE,
    ...overrides,
  };
}

function listModel(
  tasks: Task[],
  sections: TaskReadModel["sections"],
  requestedFilters: Readonly<{ searchText?: string; status: "open" | "completed" }>,
  emptyTitle: string
): TaskListModel {
  return buildTaskListModel({
    read: {
      data: {
        projects: [...STORE_MEDIA_PROJECTS],
        tasks,
        sections,
        freshness: "fresh",
        fetchedAt: Date.parse(STORE_MEDIA_NOW_ISO),
        isPartial: false,
        failedProjectIds: [],
      },
      isLoading: false,
      isRefreshing: false,
    },
    filtersReady: true,
    requestedFilters,
    emptyTitle,
    capabilities: CAPABILITIES,
  });
}

function resultSectionTitles(model: TaskListModel): string[] {
  return model.content.kind === "results" ? model.content.sections.map((section) => section.title) : [];
}

function snapshotFixtureValue(value: unknown, key: string | undefined, active: WeakSet<object>): unknown {
  if (typeof value === "string") {
    if (UNSAFE_STRING_PATTERN.test(value)) throw new Error(UNSAFE_FIXTURE_MESSAGE);
    if (key !== undefined && IDENTIFIER_KEY_PATTERN.test(key) && !value.startsWith("store-demo-")) {
      throw new Error(UNSAFE_FIXTURE_MESSAGE);
    }
    return value;
  }
  if (value === null || value === undefined || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(UNSAFE_FIXTURE_MESSAGE);
    return value;
  }
  if (typeof value !== "object") throw new Error(UNSAFE_FIXTURE_MESSAGE);
  if (active.has(value)) throw new Error(UNSAFE_FIXTURE_MESSAGE);

  active.add(value);
  try {
    if (value instanceof Date) {
      const epochMs = Date.prototype.getTime.call(value);
      if (!Number.isFinite(epochMs)) throw new Error(UNSAFE_FIXTURE_MESSAGE);
      return Object.freeze(new Date(epochMs));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) {
      throw new Error(UNSAFE_FIXTURE_MESSAGE);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((propertyKey) => typeof propertyKey === "symbol")) throw new Error(UNSAFE_FIXTURE_MESSAGE);

    if (Array.isArray(value)) {
      const lengthDescriptor = descriptors.length;
      if (!("value" in lengthDescriptor) || typeof lengthDescriptor.value !== "number") {
        throw new Error(UNSAFE_FIXTURE_MESSAGE);
      }
      const result: unknown[] = [];
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) throw new Error(UNSAFE_FIXTURE_MESSAGE);
        result.push(snapshotFixtureValue(descriptor.value, key, active));
      }
      if (keys.some((propertyKey) => propertyKey !== "length" && !/^(?:0|[1-9]\d*)$/u.test(String(propertyKey)))) {
        throw new Error(UNSAFE_FIXTURE_MESSAGE);
      }
      return Object.freeze(result);
    }

    const result: Record<string, unknown> = {};
    for (const propertyKey of keys) {
      if (typeof propertyKey !== "string" || propertyKey === "__proto__") throw new Error(UNSAFE_FIXTURE_MESSAGE);
      const descriptor = descriptors[propertyKey];
      if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(UNSAFE_FIXTURE_MESSAGE);
      Object.defineProperty(result, propertyKey, {
        value: snapshotFixtureValue(descriptor.value, propertyKey, active),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    return Object.freeze(result);
  } finally {
    active.delete(value);
  }
}

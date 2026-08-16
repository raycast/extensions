import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Action, Icon, List, type Keyboard } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { ErrorPresentation } from "../application/errorPresentation";
import type { TaskMutationService } from "../application/TaskMutationService";
import type { TaskReadModel, TickTickService } from "../application/TickTickService";
import {
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PartialRefreshError,
  PermissionError,
  ProtocolError,
  RateLimitError,
} from "../domain/errors";
import type { Task } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import { raycastTaskFilterStorage } from "../platform/RaycastTaskFilterStorage";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";
import type { TaskMutationState } from "../hooks/useTaskMutation";
import type { TaskQueryState } from "../hooks/useTaskQuery";
import type { TaskListFilterState } from "../hooks/useTaskListFilters";
import {
  INBOX_COMMAND,
  NEXT_SEVEN_COMMAND,
  SEARCH_COMMAND,
  TODAY_COMMAND,
  resolveSearchCommandConfig,
  type TaskCommandConfig,
} from "../commands/taskCommandConfigs";
import { buildCombinedTaskFilter } from "./taskListModel";
import type { DomainTaskItemProps } from "./DomainTaskItem";
import type { MoveTaskFormProps } from "./MoveTaskForm";
import type { StaleDataWarningProps } from "./StaleDataWarning";
import type { TaskFormProps } from "./TaskForm";
import {
  TaskListView,
  type TaskListReadyRuntime,
  type TaskListRecoveryHandlers,
  type TaskListRuntime,
  type TaskListViewProps,
} from "./TaskListView";

const boundary = vi.hoisted(() => {
  const filterStorage = Object.freeze({ kind: "raycast-filter-storage" });
  return {
    useTaskQuery: vi.fn(),
    useTaskListFilters: vi.fn(),
    useTaskMutation: vi.fn(),
    navigation: { push: vi.fn(), pop: vi.fn() },
    emptyDescription: vi.fn(),
    filterStorage,
    MockCombinedTaskFilter: function MockCombinedTaskFilter() {
      return null;
    },
    MockConnectionActions: function MockConnectionActions() {
      return null;
    },
    MockDomainTaskItem: function MockDomainTaskItem() {
      return null;
    },
    MockMoveTaskForm: function MockMoveTaskForm() {
      return null;
    },
    MockStaleDataWarning: function MockStaleDataWarning() {
      return null;
    },
    MockTaskForm: function MockTaskForm() {
      return null;
    },
  };
});

type HookCleanup = () => void;
type HookEffect = () => void | HookCleanup;
type HookSlot =
  | { kind: "ref"; current: unknown }
  | { kind: "effect"; dependencies?: readonly unknown[]; cleanup?: HookCleanup };

const reactHooks = vi.hoisted(() => {
  const slots: HookSlot[] = [];
  let cursor = 0;
  let pending: Array<{
    index: number;
    effect: HookEffect;
    dependencies?: readonly unknown[];
  }> = [];

  return {
    reset(): void {
      slots.splice(0);
      cursor = 0;
      pending = [];
    },
    beginRender(): void {
      cursor = 0;
    },
    useRef<T>(initial: T): { current: T } {
      const index = cursor++;
      if (!slots[index]) slots[index] = { kind: "ref", current: initial };
      const slot = slots[index];
      if (slot.kind !== "ref") throw new Error("Hook order changed");
      return slot as { kind: "ref"; current: T };
    },
    useEffect(effect: HookEffect, dependencies?: readonly unknown[]): void {
      const index = cursor++;
      const existing = slots[index];
      const unchanged =
        existing?.kind === "effect" &&
        dependencies !== undefined &&
        existing.dependencies !== undefined &&
        existing.dependencies.length === dependencies.length &&
        existing.dependencies.every((value, dependencyIndex) => Object.is(value, dependencies[dependencyIndex]));
      if (!unchanged) pending.push({ index, effect, dependencies });
      if (!existing) slots[index] = { kind: "effect", dependencies };
    },
    flushEffects(): void {
      const effects = pending;
      pending = [];
      for (const { index, effect, dependencies } of effects) {
        const previous = slots[index];
        if (previous?.kind === "effect") previous.cleanup?.();
        const cleanup = effect();
        slots[index] = { kind: "effect", dependencies, ...(cleanup ? { cleanup } : {}) };
      }
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: <T>(initial: T) => reactHooks.useRef(initial),
  useEffect: (effect: HookEffect, dependencies?: readonly unknown[]) => reactHooks.useEffect(effect, dependencies),
}));

vi.mock("@raycast/api", () => {
  const MockAction = function MockAction() {
    return null;
  };
  const MockActionPanel = function MockActionPanel() {
    return null;
  };
  const MockList = function MockList() {
    return null;
  };
  const MockListItem = function MockListItem() {
    return null;
  };
  return {
    Action: Object.assign(MockAction, {
      Open: function MockActionOpen() {
        return null;
      },
      CopyToClipboard: function MockCopyToClipboard() {
        return null;
      },
    }),
    ActionPanel: Object.assign(MockActionPanel, {
      Section: function MockActionPanelSection() {
        return null;
      },
    }),
    Icon: {
      ArrowRight: "icon-arrow-right",
      ExclamationMark: "icon-exclamation",
      List: "icon-list",
      RotateClockwise: "icon-refresh",
      Warning: "icon-warning",
    },
    List: Object.assign(MockList, {
      EmptyView: function MockEmptyView() {
        return null;
      },
      Item: Object.assign(MockListItem, {
        Detail: function MockListItemDetail() {
          return null;
        },
      }),
      Section: function MockListSection() {
        return null;
      },
    }),
    useNavigation: () => boundary.navigation,
  };
});

vi.mock("../hooks/useTaskQuery", () => ({ useTaskQuery: boundary.useTaskQuery }));
vi.mock("../hooks/useTaskListFilters", () => ({ useTaskListFilters: boundary.useTaskListFilters }));
vi.mock("../hooks/useTaskMutation", () => ({ useTaskMutation: boundary.useTaskMutation }));
vi.mock("../platform/RaycastTaskFilterStorage", () => ({ raycastTaskFilterStorage: boundary.filterStorage }));
vi.mock("./CombinedTaskFilter", () => ({
  CombinedTaskFilter: boundary.MockCombinedTaskFilter,
  default: boundary.MockCombinedTaskFilter,
}));
vi.mock("./ConnectionActions", () => ({
  ConnectionActions: boundary.MockConnectionActions,
  default: boundary.MockConnectionActions,
}));
vi.mock("./DomainTaskItem", () => ({
  DomainTaskItem: boundary.MockDomainTaskItem,
  default: boundary.MockDomainTaskItem,
}));
vi.mock("./MoveTaskForm", () => ({ default: boundary.MockMoveTaskForm }));
vi.mock("./TaskForm", () => ({ default: boundary.MockTaskForm }));
vi.mock("./StaleDataWarning", () => ({
  StaleDataWarning: boundary.MockStaleDataWarning,
  default: boundary.MockStaleDataWarning,
  buildEmptyStateHealthDescription: boundary.emptyDescription,
}));

const fullCapabilities: BackendCapabilities = Object.freeze({
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: true,
});

const accountKey = "PRIVATE-account-key";
const uiTimeZone = "America/Denver";
const taskService = Object.freeze({ kind: "task-service" }) as unknown as TickTickService;
const mutationService = Object.freeze({ backendId: "mcp" }) as unknown as TaskMutationService;
const firstTask = taskFixture({ id: "first", title: "First task", projectId: inboxProject.id });
const secondTask = taskFixture({ id: "second", title: "Second task", projectId: workProject.id });

function readModel(overrides: Partial<TaskReadModel> = {}): TaskReadModel {
  const tasks = overrides.tasks ?? [firstTask, secondTask];
  return {
    projects: [inboxProject, workProject],
    tasks,
    sections: overrides.sections ?? [
      { id: "first-section", title: "First Section", tasks: [tasks[0]] },
      ...(tasks[1] ? [{ id: "second-section", title: "Second Section", tasks: [tasks[1]] }] : []),
    ],
    freshness: "fresh",
    fetchedAt: 1_000,
    isPartial: false,
    failedProjectIds: [],
    ...overrides,
  };
}

let queryState: TaskQueryState;
let filterState: TaskListFilterState;
let mutationState: TaskMutationState;
let revalidate: ReturnType<typeof vi.fn<() => Promise<void>>>;
let clearError: ReturnType<typeof vi.fn<() => void>>;

function readyRuntime(overrides: Partial<TaskListReadyRuntime> = {}): TaskListReadyRuntime {
  return Object.freeze({
    kind: "ready",
    accountKey,
    taskService,
    mutationService,
    capabilities: fullCapabilities,
    uiTimeZone,
    exactLinkStrategy: undefined,
    ...overrides,
  });
}

function props(
  config: TaskCommandConfig = SEARCH_COMMAND,
  runtime: TaskListRuntime = readyRuntime()
): TaskListViewProps {
  return Object.freeze({ config, runtime });
}

type ListProps = Readonly<{
  filtering?: boolean;
  isLoading?: boolean;
  isShowingDetail?: boolean;
  searchText?: string;
  searchBarPlaceholder?: string;
  searchBarAccessory?: ReactElement;
  onSearchTextChange?: (value: string) => void;
  children?: ReactNode;
}>;

type EmptyViewProps = Readonly<{
  title?: string;
  description?: string;
  actions?: ReactElement;
}>;

type ActionProps = Readonly<{
  title: string;
  icon?: unknown;
  shortcut?: Keyboard.Shortcut;
  onAction?: () => void | Promise<void>;
}>;

type SectionProps = Readonly<{ title?: string; subtitle?: string; children?: ReactNode }>;
type ItemProps = Readonly<{ id?: string; title: string; subtitle?: string; icon?: unknown; actions?: ReactElement }>;

function renderTaskList(input: TaskListViewProps = props()): ReactElement<ListProps> {
  reactHooks.beginRender();
  let root = TaskListView(input) as ReactElement;
  for (let depth = 0; depth < 3 && root.type !== List; depth += 1) {
    if (typeof root.type !== "function") throw new Error("Expected a function component boundary");
    root = (root.type as (componentProps: unknown) => ReactElement)(root.props);
  }
  if (root.type !== List) throw new Error("Expected a Raycast List root");
  reactHooks.flushEffects();
  return root as ReactElement<ListProps>;
}

function elements(node: ReactNode): ReactElement[] {
  return Children.toArray(node).filter(isValidElement) as ReactElement[];
}

function childOfType<Props>(root: ReactElement<ListProps>, type: unknown): ReactElement<Props>[] {
  return elements(root.props.children).filter((element) => element.type === type) as ReactElement<Props>[];
}

function emptyView(root: ReactElement<ListProps>): ReactElement<EmptyViewProps> | undefined {
  return childOfType<EmptyViewProps>(root, List.EmptyView)[0];
}

function renderedSections(root: ReactElement<ListProps>): ReactElement<SectionProps>[] {
  return childOfType<SectionProps>(root, List.Section);
}

function domainRows(root: ReactElement<ListProps>): ReactElement<DomainTaskItemProps>[] {
  return renderedSections(root).flatMap((section) =>
    elements(section.props.children).filter((element) => element.type === boundary.MockDomainTaskItem)
  ) as ReactElement<DomainTaskItemProps>[];
}

function mutationRows(root: ReactElement<ListProps>): ReactElement<ItemProps>[] {
  return childOfType<ItemProps>(root, List.Item).filter((item) => item.props.id === "ticktick-mutation-error");
}

function panelActions(panel: ReactElement | undefined): ReactElement<ActionProps>[] {
  if (!panel) return [];
  return elements((panel.props as { children?: ReactNode }).children).filter(
    (element) => element.type === Action
  ) as ReactElement<ActionProps>[];
}

function formPushed<Type>(type: unknown): ReactElement<Type> {
  const target = boundary.navigation.push.mock.calls.at(-1)?.[0] as ReactElement<Type> | undefined;
  if (!target || target.type !== type) throw new Error("Expected pushed form target");
  return target;
}

beforeEach(() => {
  vi.clearAllMocks();
  boundary.navigation.push.mockReset();
  boundary.navigation.pop.mockReset();
  reactHooks.reset();
  revalidate = vi.fn<() => Promise<void>>(async () => undefined);
  clearError = vi.fn<() => void>();
  queryState = { data: readModel(), isLoading: false, isRefreshing: false, revalidate };
  filterState = {
    filters: Object.freeze({ searchText: "", status: "open" }),
    filtersReady: true,
    combinedFilter: buildCombinedTaskFilter({ searchText: "", status: "open" }, [inboxProject, workProject], true),
    setSearchText: vi.fn(),
    selectCombinedFilter: vi.fn(),
  };
  mutationState = {
    hasPending: false,
    isPending: vi.fn(() => false),
    complete: vi.fn(async () => undefined),
    reopen: vi.fn(async () => undefined),
    update: vi.fn(async (task: Task, patch) => ({ ...task, ...patch })),
    move: vi.fn(async (task: Task, projectId) => ({ ...task, projectId })),
    retry: vi.fn(async () => undefined),
    clearError,
  };
  boundary.useTaskQuery.mockImplementation(() => queryState);
  boundary.useTaskListFilters.mockImplementation(() => filterState);
  boundary.useTaskMutation.mockImplementation(() => mutationState);
  boundary.emptyDescription.mockReturnValue(undefined);
});

describe("TaskListView public composition contract", () => {
  it("keeps the runtime discriminant and props exact", () => {
    expectTypeOf<TaskListRecoveryHandlers>().toEqualTypeOf<
      Readonly<{
        onReconnect?: () => void | Promise<void>;
        onOpenPreferences?: () => void | Promise<void>;
        onRefresh?: () => void | Promise<void>;
        onRetry?: () => void | Promise<void>;
      }>
    >();
    expectTypeOf<TaskListViewProps>().toEqualTypeOf<
      Readonly<{ config: TaskCommandConfig; runtime: TaskListRuntime }>
    >();
    expectTypeOf<TaskListRuntime["kind"]>().toEqualTypeOf<"loading" | "error" | "ready">();
    expectTypeOf<TaskListReadyRuntime["exactLinkStrategy"]>().toEqualTypeOf<
      "backend-url" | "native-project-uri" | undefined
    >();
  });

  it("renders runtime loading without mounting ready hooks or flashing an EmptyView", () => {
    const root = renderTaskList(props(TODAY_COMMAND, { kind: "loading" }));

    expect(root.props.isLoading).toBe(true);
    expect(root.props.filtering).toBe(false);
    expect(elements(root.props.children)).toEqual([]);
    expect(boundary.useTaskQuery).not.toHaveBeenCalled();
    expect(boundary.useTaskListFilters).not.toHaveBeenCalled();
    expect(boundary.useTaskMutation).not.toHaveBeenCalled();
  });

  it("renders a sanitized runtime error and forwards only injected recovery handlers", () => {
    const presentation: ErrorPresentation = {
      kind: "authentication",
      title: "Reconnect TickTick",
      message: "Your TickTick connection is no longer valid.",
      severity: "error",
      retainData: true,
      actions: [
        { kind: "reconnect", title: "Reconnect" },
        { kind: "open-preferences", title: "Open Preferences" },
      ],
    };
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const root = renderTaskList(
      props(TODAY_COMMAND, {
        kind: "error",
        presentation,
        recovery: { onReconnect, onOpenPreferences },
      })
    );
    const empty = emptyView(root) as ReactElement<EmptyViewProps>;
    const [connection] = elements((empty.props.actions?.props as { children?: ReactNode }).children);

    expect(empty.props.title).toBe(presentation.title);
    expect(empty.props.description).toBe(presentation.message);
    expect(connection.type).toBe(boundary.MockConnectionActions);
    expect(connection.props).toEqual({ presentation, onReconnect, onOpenPreferences });
    expect(boundary.useTaskQuery).not.toHaveBeenCalled();
  });

  it("fails an invalid command config closed before mounting any ready hook", () => {
    const invalid = Object.freeze({
      query: Object.freeze({ view: "today", status: "all" }),
      placeholder: "PRIVATE-invalid-placeholder",
      emptyTitle: "PRIVATE-invalid-empty",
    }) as unknown as TaskCommandConfig;
    const root = renderTaskList(props(invalid));
    const empty = emptyView(root) as ReactElement<EmptyViewProps>;

    expect(empty.props.title).toBe("Unsupported TickTick Response");
    expect(empty.props.description).toBe("TickTick returned data this extension could not safely process.");
    expect(JSON.stringify(root)).not.toContain("PRIVATE-invalid");
    expect(boundary.useTaskQuery).not.toHaveBeenCalled();
  });

  it.each([
    [TODAY_COMMAND, "PRIVATE today copy"],
    [NEXT_SEVEN_COMMAND, "PRIVATE next copy"],
    [INBOX_COMMAND, "PRIVATE inbox copy"],
    [SEARCH_COMMAND, "PRIVATE search copy"],
    [resolveSearchCommandConfig(true), "PRIVATE resolved all copy"],
    [resolveSearchCommandConfig(false), "PRIVATE resolved open copy"],
  ] as const)("rejects non-canonical visible copy before ready hooks", (canonical, privateCopy) => {
    const invalid = {
      ...canonical,
      placeholder: privateCopy,
      emptyTitle: canonical.emptyTitle,
    } as TaskCommandConfig;

    const root = renderTaskList(props(invalid));

    expect(emptyView(root)?.props).toMatchObject({
      title: "Unsupported TickTick Response",
      description: "TickTick returned data this extension could not safely process.",
    });
    expect(JSON.stringify(root)).not.toContain(privateCopy);
    expect(boundary.useTaskQuery).not.toHaveBeenCalled();
  });

  it("snapshots one-read canonical config getters exactly once before ready hooks", () => {
    let queryReads = 0;
    let placeholderReads = 0;
    let emptyTitleReads = 0;
    const config = {
      get query() {
        queryReads += 1;
        if (queryReads > 1) throw new Error("PRIVATE repeated query read");
        return TODAY_COMMAND.query;
      },
      get placeholder() {
        placeholderReads += 1;
        if (placeholderReads > 1) throw new Error("PRIVATE repeated placeholder read");
        return TODAY_COMMAND.placeholder;
      },
      get emptyTitle() {
        emptyTitleReads += 1;
        if (emptyTitleReads > 1) throw new Error("PRIVATE repeated empty read");
        return TODAY_COMMAND.emptyTitle;
      },
    } as TaskCommandConfig;

    const root = renderTaskList(props(config));

    expect(root.props.searchBarPlaceholder).toBe(TODAY_COMMAND.placeholder);
    expect([queryReads, placeholderReads, emptyTitleReads]).toEqual([1, 1, 1]);
    expect(boundary.useTaskQuery).toHaveBeenCalledTimes(1);
  });

  it.each(["query", "placeholder", "emptyTitle"] as const)(
    "fails a throwing %s getter closed without mounting ready hooks",
    (throwingKey) => {
      const config = {
        get query() {
          if (throwingKey === "query") throw new Error("PRIVATE query getter");
          return TODAY_COMMAND.query;
        },
        get placeholder() {
          if (throwingKey === "placeholder") throw new Error("PRIVATE placeholder getter");
          return TODAY_COMMAND.placeholder;
        },
        get emptyTitle() {
          if (throwingKey === "emptyTitle") throw new Error("PRIVATE empty getter");
          return TODAY_COMMAND.emptyTitle;
        },
      } as TaskCommandConfig;

      const root = renderTaskList(props(config));

      expect(emptyView(root)?.props.title).toBe("Unsupported TickTick Response");
      expect(JSON.stringify(root)).not.toContain("PRIVATE");
      expect(boundary.useTaskQuery).not.toHaveBeenCalled();
    }
  );

  it("snapshots nested query view and status getters exactly once", () => {
    let viewReads = 0;
    let statusReads = 0;
    const config = {
      query: {
        get view() {
          viewReads += 1;
          if (viewReads > 1) throw new Error("PRIVATE repeated view read");
          return "today" as const;
        },
        get status() {
          statusReads += 1;
          if (statusReads > 1) throw new Error("PRIVATE repeated status read");
          return "open" as const;
        },
      },
      placeholder: TODAY_COMMAND.placeholder,
      emptyTitle: TODAY_COMMAND.emptyTitle,
    } as TaskCommandConfig;

    const root = renderTaskList(props(config));

    expect(root.props.searchBarPlaceholder).toBe(TODAY_COMMAND.placeholder);
    expect([viewReads, statusReads]).toEqual([1, 1]);
    expect(boundary.useTaskQuery).toHaveBeenCalledTimes(1);
  });

  it.each(["view", "status"] as const)("fails a throwing nested query %s closed", (throwingKey) => {
    const config = {
      query: {
        get view() {
          if (throwingKey === "view") throw new Error("PRIVATE nested view getter");
          return "today" as const;
        },
        get status() {
          if (throwingKey === "status") throw new Error("PRIVATE nested status getter");
          return "open" as const;
        },
      },
      placeholder: TODAY_COMMAND.placeholder,
      emptyTitle: TODAY_COMMAND.emptyTitle,
    } as TaskCommandConfig;

    const root = renderTaskList(props(config));

    expect(emptyView(root)?.props).toMatchObject({
      title: "Unsupported TickTick Response",
      description: "TickTick returned data this extension could not safely process.",
    });
    expect(JSON.stringify(root)).not.toContain("PRIVATE");
    expect(boundary.useTaskQuery).not.toHaveBeenCalled();
  });
});

describe("ready runtime lifecycle isolation", () => {
  it.each(["backend", "account", "query", "runtime"] as const)(
    "does not carry a refresh-required gate across an exact %s scope change",
    (changedScope) => {
      const initialRuntime = readyRuntime();
      mutationState = {
        ...mutationState,
        error: {
          title: "Task Update Status Unknown",
          message: "Refresh before trying again.",
          canRetry: false,
          refreshRequired: true,
        },
      };
      expect(domainRows(renderTaskList(props(SEARCH_COMMAND, initialRuntime)))[0].props.onComplete).toBeUndefined();

      mutationState = { ...mutationState, error: undefined };
      let nextConfig: TaskCommandConfig = SEARCH_COMMAND;
      let nextRuntime = initialRuntime;
      if (changedScope === "backend") {
        nextRuntime = readyRuntime({
          mutationService: Object.freeze({ backendId: "openapi" }) as unknown as TaskMutationService,
        });
      } else if (changedScope === "account") {
        nextRuntime = readyRuntime({ accountKey: "PRIVATE-next-account" });
      } else if (changedScope === "query") {
        nextConfig = TODAY_COMMAND;
      } else {
        nextRuntime = readyRuntime({
          taskService: Object.freeze({ kind: "next-task-service" }) as unknown as TickTickService,
        });
      }

      const nextRow = domainRows(renderTaskList(props(nextConfig, nextRuntime)))[0];

      expect(nextRow.props.onComplete).toEqual(expect.any(Function));
      expect(clearError).not.toHaveBeenCalled();
    }
  );

  it("preserves an uncertainty gate when only non-authority runtime presentation values change", () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    renderTaskList();

    mutationState = { ...mutationState, error: undefined };
    const presentationOnlyRuntime = readyRuntime({
      capabilities: Object.freeze({ ...fullCapabilities }),
      uiTimeZone: "UTC",
      exactLinkStrategy: "native-project-uri",
      onReconnect: vi.fn(),
      onOpenPreferences: vi.fn(),
    });
    const stillBlocked = domainRows(renderTaskList(props(SEARCH_COMMAND, presentationOnlyRuntime)))[0];

    expect(stillBlocked.props.onComplete).toBeUndefined();
    expect(stillBlocked.props.onEdit).toBeUndefined();
    expect(stillBlocked.props.onMove).toBeUndefined();
    expect(clearError).not.toHaveBeenCalled();
  });

  it("does not let settled refresh evidence from an old runtime clear a new runtime gate", async () => {
    const initialError = {
      title: "Task Update Status Unknown",
      message: "Refresh before trying again.",
      canRetry: false,
      refreshRequired: true,
    } as const;
    mutationState = { ...mutationState, error: initialError };
    const [oldErrorRow] = mutationRows(renderTaskList());
    const [oldRefresh] = panelActions(oldErrorRow.props.actions);
    await oldRefresh.props.onAction?.();

    mutationState = { ...mutationState, error: { ...initialError } };
    const nextRuntime = readyRuntime({
      taskService: Object.freeze({ kind: "next-task-service" }) as unknown as TickTickService,
    });
    const nextRoot = renderTaskList(props(SEARCH_COMMAND, nextRuntime));

    expect(domainRows(nextRoot)[0].props.onComplete).toBeUndefined();
    expect(clearError).not.toHaveBeenCalled();
  });

  it("makes every captured service callback and open form from an old runtime inert", async () => {
    const oldRevalidate = revalidate;
    const oldMutation = {
      ...mutationState,
      error: {
        title: "Couldn't Update Task",
        message: "Try again.",
        canRetry: true,
        refreshRequired: false,
      },
    } satisfies TaskMutationState;
    mutationState = oldMutation;
    const initialRuntime = readyRuntime();
    const oldRoot = renderTaskList(props(SEARCH_COMMAND, initialRuntime));
    const oldRow = domainRows(oldRoot)[0];
    const oldComplete = oldRow.props.onComplete as () => Promise<void>;
    const oldRefresh = oldRow.props.onRefresh as () => Promise<void>;
    const [oldRetry] = panelActions(mutationRows(oldRoot)[0].props.actions);
    oldRow.props.onEdit?.();
    const oldEditForm = formPushed<TaskFormProps>(boundary.MockTaskForm);
    oldRow.props.onMove?.();
    const oldMoveForm = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);

    const nextRevalidate = vi.fn<() => Promise<void>>(async () => undefined);
    const nextComplete = vi.fn(async () => undefined);
    revalidate = nextRevalidate;
    queryState = { data: readModel(), isLoading: false, isRefreshing: false, revalidate: nextRevalidate };
    mutationState = {
      hasPending: false,
      isPending: vi.fn(() => false),
      complete: nextComplete,
      reopen: vi.fn(async () => undefined),
      update: vi.fn(async (task: Task, patch) => ({ ...task, ...patch })),
      move: vi.fn(async (task: Task, projectId) => ({ ...task, projectId })),
      retry: vi.fn(async () => undefined),
      clearError: vi.fn(),
    };
    const nextRuntime = readyRuntime({
      taskService: Object.freeze({ kind: "next-task-service" }) as unknown as TickTickService,
      mutationService: Object.freeze({ backendId: "mcp" }) as unknown as TaskMutationService,
    });
    const nextRow = domainRows(renderTaskList(props(SEARCH_COMMAND, nextRuntime)))[0];

    await expect(oldComplete()).resolves.toBeUndefined();
    await expect(oldRefresh()).resolves.toBeUndefined();
    await expect(oldRetry.props.onAction?.()).resolves.toBeUndefined();
    await expect(
      oldEditForm.props.onSubmit({ ...oldEditForm.props.initialValues, title: "Must stay inert" })
    ).resolves.toBeUndefined();
    await expect(oldMoveForm.props.onMove(workProject.id)).resolves.toBeUndefined();
    await expect(nextRow.props.onComplete?.()).resolves.toBeUndefined();

    expect(oldMutation.complete).not.toHaveBeenCalled();
    expect(oldMutation.update).not.toHaveBeenCalled();
    expect(oldMutation.move).not.toHaveBeenCalled();
    expect(oldMutation.retry).not.toHaveBeenCalled();
    expect(oldMutation.clearError).not.toHaveBeenCalled();
    expect(oldRevalidate).not.toHaveBeenCalled();
    expect(nextComplete).toHaveBeenCalledTimes(1);
  });
});

describe("stable reads and local filters", () => {
  it.each([
    [TODAY_COMMAND, true, { view: "today", status: "open" }, "ephemeral", false, undefined],
    [NEXT_SEVEN_COMMAND, true, { view: "next7Days", status: "open" }, "ephemeral", false, undefined],
    [INBOX_COMMAND, true, { view: "inbox", status: "open" }, "ephemeral", false, undefined],
    [SEARCH_COMMAND, true, { view: "search", status: "all" }, "search", true, raycastTaskFilterStorage],
    [SEARCH_COMMAND, false, { view: "search", status: "open" }, "search", false, raycastTaskFilterStorage],
  ] as const)(
    "builds one stable query and effective filter contract",
    (config, completedQuery, expectedQuery, expectedMode, expectedCompleted, expectedStorage) => {
      const runtime = readyRuntime({ capabilities: { ...fullCapabilities, completedQuery } });
      renderTaskList(props(config, runtime));

      expect(boundary.useTaskQuery).toHaveBeenCalledWith(taskService, accountKey, expectedQuery);
      expect(boundary.useTaskListFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: expectedMode,
          defaultStatus: "open",
          projects: queryState.data?.projects,
          catalogAuthoritative: true,
          completedQuery: expectedCompleted,
          storage: expectedStorage,
        })
      );
      const contextKey = boundary.useTaskListFilters.mock.calls[0][0].contextKey as string;
      expect(contextKey).toContain("mcp");
      expect(contextKey).toContain(accountKey);
      expect(contextKey).toContain(expectedQuery.view);
    }
  );

  it("never sends local search, project, or visible status fields to the remote query", () => {
    const privateSearch = "PRIVATE-local-search";
    filterState = {
      ...filterState,
      filters: { searchText: privateSearch, projectId: workProject.id, status: "completed" },
      combinedFilter: buildCombinedTaskFilter(
        { searchText: privateSearch, projectId: workProject.id, status: "completed" },
        [inboxProject, workProject],
        true
      ),
    };

    renderTaskList();
    const remoteQuery = boundary.useTaskQuery.mock.calls[0][2];

    expect(remoteQuery).toEqual({ view: "search", status: "all" });
    expect(remoteQuery).not.toHaveProperty("searchText");
    expect(remoteQuery).not.toHaveProperty("projectId");
    expect(JSON.stringify(remoteQuery)).not.toContain(privateSearch);
    expect(JSON.stringify(remoteQuery)).not.toContain(workProject.id);
  });

  it("renders a controlled locally-filtered List and Search-only combined dropdown", () => {
    filterState = { ...filterState, filters: { searchText: "needle", status: "open" } };
    const searchRoot = renderTaskList();
    const todayRoot = renderTaskList(props(TODAY_COMMAND));

    expect(searchRoot.props).toMatchObject({
      filtering: false,
      isShowingDetail: true,
      searchText: "needle",
      searchBarPlaceholder: SEARCH_COMMAND.placeholder,
      onSearchTextChange: filterState.setSearchText,
    });
    expect(searchRoot.props.searchBarAccessory?.type).toBe(boundary.MockCombinedTaskFilter);
    expect(searchRoot.props.searchBarAccessory?.props).toEqual({
      model: filterState.combinedFilter,
      onSelection: filterState.selectCombinedFilter,
    });
    expect(todayRoot.props.searchBarAccessory).toBeUndefined();
  });

  it("passes a non-authoritative empty catalog before the first snapshot", () => {
    queryState = { isLoading: true, isRefreshing: false, revalidate };
    renderTaskList();

    expect(boundary.useTaskListFilters).toHaveBeenCalledWith(
      expect.objectContaining({ projects: [], catalogAuthoritative: false })
    );
  });
});

describe("loading, empty, health, and error rendering", () => {
  it.each(["snapshot", "filters"] as const)("does not flicker EmptyView while %s is loading", (cause) => {
    if (cause === "snapshot") queryState = { isLoading: false, isRefreshing: false, revalidate };
    else filterState = { ...filterState, filtersReady: false };

    const root = renderTaskList();

    expect(root.props.isLoading).toBe(cause === "filters");
    expect(emptyView(root)).toBeUndefined();
    expect(domainRows(root)).toEqual([]);
  });

  it("renders the exact healthy empty title, helper description, and qualified manual Refresh", async () => {
    queryState = { data: readModel({ tasks: [], sections: [] }), isLoading: false, isRefreshing: false, revalidate };
    const root = renderTaskList(props(TODAY_COMMAND));
    const empty = emptyView(root) as ReactElement<EmptyViewProps>;
    const [refresh] = panelActions(empty.props.actions);

    expect(empty.props.title).toBe(TODAY_COMMAND.emptyTitle);
    expect(empty.props.description).toBeUndefined();
    expect(boundary.emptyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ freshness: "fresh", isPartial: false })
    );
    expect(refresh.props.title).toBe("Refresh");
    await refresh.props.onAction?.();
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
  });

  it("uses the accepted health description helper for stale or partial empty data", () => {
    const healthDescription = "Showing Cached Tasks: Cached tasks are shown.";
    boundary.emptyDescription.mockReturnValue(healthDescription);
    queryState = {
      data: readModel({
        tasks: [],
        sections: [],
        freshness: "stale",
        isPartial: true,
        failedProjectIds: [workProject.id],
        warning: "Cached tasks are shown.",
      }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };

    const empty = emptyView(renderTaskList()) as ReactElement<EmptyViewProps>;

    expect(empty.props.description).toBe(healthDescription);
    expect(boundary.emptyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ freshness: "stale", isPartial: true, warning: "Cached tasks are shown." })
    );
  });

  it.each([
    [new AuthenticationError("PRIVATE auth"), ["reconnect", "open-preferences"]],
    [new PermissionError("PRIVATE permission"), ["open-preferences"]],
    [new RateLimitError("PRIVATE rate limit"), ["retry"]],
    [new NetworkError("PRIVATE network"), ["refresh"]],
    [new PartialRefreshError("PRIVATE partial"), ["refresh"]],
    [new ProtocolError("PRIVATE protocol"), ["refresh"]],
  ] as const)("uses an empty retained read error's exact recovery contract", (error, actionKinds) => {
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    queryState = {
      data: readModel({ tasks: [], sections: [] }),
      error,
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };

    const empty = emptyView(
      renderTaskList(props(SEARCH_COMMAND, readyRuntime({ onReconnect, onOpenPreferences })))
    ) as ReactElement<EmptyViewProps>;
    const [connection] = elements((empty.props.actions?.props as { children?: ReactNode }).children);
    const connectionProps = connection?.props as
      | {
          presentation?: ErrorPresentation;
          onReconnect?: unknown;
          onOpenPreferences?: unknown;
          onRefresh?: unknown;
          onRetry?: unknown;
        }
      | undefined;

    expect(boundary.emptyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ readError: expect.objectContaining({ kind: expect.any(String) }) })
    );
    expect(connection?.type).toBe(boundary.MockConnectionActions);
    expect(connectionProps?.presentation?.actions.map((action) => action.kind)).toEqual(actionKinds);
    expect(connectionProps).toMatchObject({
      onReconnect,
      onOpenPreferences,
      onRefresh: expect.any(Function),
      onRetry: expect.any(Function),
    });
    expect(JSON.stringify(empty)).not.toContain("PRIVATE");
  });

  it("renders a sanitized initial read error with manual recovery handlers", () => {
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    queryState = {
      error: new AuthenticationError("PRIVATE raw authentication body"),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    const root = renderTaskList(props(SEARCH_COMMAND, readyRuntime({ onReconnect, onOpenPreferences })));
    const empty = emptyView(root) as ReactElement<EmptyViewProps>;
    const [connection] = elements((empty.props.actions?.props as { children?: ReactNode }).children);

    expect(empty.props.title).toBe("Reconnect TickTick");
    expect(empty.props.description).not.toContain("PRIVATE");
    const connectionProps = connection.props as {
      onReconnect?: unknown;
      onOpenPreferences?: unknown;
      onRefresh?: unknown;
      onRetry?: unknown;
    };
    expect(connectionProps).toMatchObject({ onReconnect, onOpenPreferences });
    expect(connectionProps.onRefresh).toEqual(expect.any(Function));
    expect(connectionProps.onRetry).toEqual(expect.any(Function));
  });

  it("replaces results for a non-retainable read error", () => {
    queryState = {
      data: readModel(),
      error: new NotFoundError("PRIVATE missing task"),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };

    const root = renderTaskList();

    expect(emptyView(root)?.props.title).toBe("Task No Longer Available");
    expect(domainRows(root)).toEqual([]);
    expect(JSON.stringify(root)).not.toContain("PRIVATE missing task");
  });
});

describe("normalized result rows and health", () => {
  it("preserves section order and passes only normalized models plus zero-argument callbacks", () => {
    const root = renderTaskList();
    const sections = renderedSections(root);
    const rows = domainRows(root);

    expect(sections.map((section) => section.props.title)).toEqual(["First Section", "Second Section"]);
    expect(rows.map((row) => row.props.model.rowId)).toEqual([
      JSON.stringify([firstTask.projectId, firstTask.id]),
      JSON.stringify([secondTask.projectId, secondTask.id]),
    ]);
    expect(rows[0].props.model.title).toBe(firstTask.title);
    expect(rows[0].props.model.actions.map((action) => action.key)).not.toContain("open-exact");
    expect(rows[0].props.model.actions.map((action) => action.key)).toContain("search");
    expect(rows[0].props).not.toHaveProperty("task");
    expect(rows[0].props).not.toHaveProperty("projects");
    expect(rows[0].props.onComplete).toEqual(expect.any(Function));
    expect(rows[0].props.onReopen).toBeUndefined();
    expect(rows[0].props.onRefresh).toEqual(expect.any(Function));
  });

  it("injects an approved exact-link strategy without inventing a fallback", () => {
    const withoutExact = domainRows(renderTaskList())[0].props.model;
    const withExact = domainRows(
      renderTaskList(props(SEARCH_COMMAND, readyRuntime({ exactLinkStrategy: "native-project-uri" })))
    )[0].props.model;

    expect(withoutExact.exactTarget).toBeUndefined();
    expect(withoutExact.actions.map((action) => action.key)).not.toContain("open-exact");
    expect(withExact.exactTarget).toBe(
      `ticktick://widget.view.task.in.project/${encodeURIComponent(firstTask.projectId)}/${encodeURIComponent(
        firstTask.id
      )}`
    );
    expect(withExact.actions.map((action) => action.key)).toContain("open-exact");
  });

  it("keeps cached results visible while refreshing and wires accepted warning rows alongside them", () => {
    queryState = {
      data: readModel({ freshness: "stale", warning: "Cached tasks are shown." }),
      error: new NetworkError("PRIVATE network cause"),
      isLoading: false,
      isRefreshing: true,
      revalidate,
    };
    const runtime = readyRuntime({ onReconnect: vi.fn(), onOpenPreferences: vi.fn() });
    const root = renderTaskList(props(SEARCH_COMMAND, runtime));
    const [warning] = childOfType<StaleDataWarningProps>(root, boundary.MockStaleDataWarning);

    expect(root.props.isLoading).toBe(true);
    expect(domainRows(root)).toHaveLength(2);
    expect(warning.props).toMatchObject({
      hasResults: true,
      health: expect.objectContaining({ freshness: "stale", warning: "Cached tasks are shown." }),
      onReconnect: runtime.onReconnect,
      onOpenPreferences: runtime.onOpenPreferences,
      onRefresh: expect.any(Function),
      onRetry: expect.any(Function),
    });
    expect(JSON.stringify(root)).not.toContain("PRIVATE network cause");
  });
});

describe("row mutation callbacks", () => {
  it.each([
    ["complete", "onComplete", firstTask],
    ["reopen", "onReopen", { ...firstTask, status: "completed" as const }],
  ] as const)("executes %s once, then clears normalized error and revalidates", async (kind, propName, task) => {
    queryState = {
      data: readModel({ tasks: [task], sections: [{ id: "tasks", title: "Tasks", tasks: [task] }] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    filterState = { ...filterState, filters: { searchText: "", status: "all" } };
    const row = domainRows(renderTaskList())[0];
    const handler = row.props[propName] as (() => Promise<void>) | undefined;

    await handler?.();

    expect(mutationState[kind]).toHaveBeenCalledTimes(1);
    expect(mutationState[kind]).toHaveBeenCalledWith(task);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect((mutationState[kind] as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
      revalidate.mock.invocationCallOrder[0]
    );
  });

  it("propagates a mutation rejection without clearing, revalidating, or retrying", async () => {
    const failure = new Error("PRIVATE mutation failure");
    (mutationState.complete as ReturnType<typeof vi.fn>).mockRejectedValue(failure);
    const handler = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;

    await expect(handler()).rejects.toBe(failure);

    expect(clearError).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(mutationState.retry).not.toHaveBeenCalled();
  });

  it("latches a confirmed status change before best-effort revalidation across rerenders", async () => {
    const refreshFailure = new Error("PRIVATE status refresh failure");
    revalidate.mockRejectedValue(refreshFailure);
    const firstHandler = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;

    await expect(firstHandler()).resolves.toBeUndefined();
    const nextHandler = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;
    await expect(nextHandler()).resolves.toBeUndefined();

    expect(mutationState.complete).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("allows a new complete after an observed complete-reopen cycle while rejecting the captured old handler", async () => {
    filterState = { ...filterState, filters: { searchText: "", status: "all" } };
    const originalComplete = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;

    await originalComplete();
    const completed = { ...firstTask, status: "completed" as const };
    queryState = {
      data: readModel({ tasks: [completed], sections: [{ id: "tasks", title: "Tasks", tasks: [completed] }] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    const reopen = domainRows(renderTaskList())[0].props.onReopen as () => Promise<void>;
    await reopen();

    const reopened = { ...completed, status: "open" as const };
    queryState = {
      data: readModel({ tasks: [reopened], sections: [{ id: "tasks", title: "Tasks", tasks: [reopened] }] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    const nextComplete = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;

    await expect(originalComplete()).resolves.toBeUndefined();
    await expect(nextComplete()).resolves.toBeUndefined();

    expect(mutationState.complete).toHaveBeenCalledTimes(2);
    expect(mutationState.complete).toHaveBeenNthCalledWith(1, firstTask);
    expect(mutationState.complete).toHaveBeenNthCalledWith(2, reopened);
    expect(mutationState.reopen).toHaveBeenCalledTimes(1);
    expect(mutationState.reopen).toHaveBeenCalledWith(completed);
  });

  it("retires an absent authoritative task so its externally reopened instance can be completed again", async () => {
    const originalComplete = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;
    await originalComplete();

    queryState = {
      data: readModel({ tasks: [], sections: [] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    renderTaskList();

    const externallyReopened = { ...firstTask, title: "Externally reopened" };
    queryState = {
      data: readModel({
        tasks: [externallyReopened],
        sections: [{ id: "tasks", title: "Tasks", tasks: [externallyReopened] }],
      }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    const nextComplete = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;

    await expect(originalComplete()).resolves.toBeUndefined();
    await expect(nextComplete()).resolves.toBeUndefined();

    expect(mutationState.complete).toHaveBeenCalledTimes(2);
    expect(mutationState.complete).toHaveBeenNthCalledWith(1, firstTask);
    expect(mutationState.complete).toHaveBeenNthCalledWith(2, externallyReopened);
  });

  it.each(["removed", "moved"] as const)(
    "makes captured mutation handlers and open forms inert after the task is authoritatively %s",
    async (transition) => {
      const row = domainRows(renderTaskList())[0];
      const oldComplete = row.props.onComplete as () => Promise<void>;
      row.props.onEdit?.();
      const oldEditForm = formPushed<TaskFormProps>(boundary.MockTaskForm);
      row.props.onMove?.();
      const oldMoveForm = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);

      const authoritativeTasks =
        transition === "moved"
          ? [{ ...firstTask, projectId: workProject.id, projectName: workProject.name }]
          : ([] as Task[]);
      queryState = {
        data: readModel({
          tasks: authoritativeTasks,
          sections: authoritativeTasks.length > 0 ? [{ id: "tasks", title: "Tasks", tasks: authoritativeTasks }] : [],
        }),
        isLoading: false,
        isRefreshing: false,
        revalidate,
      };
      renderTaskList();

      await expect(oldComplete()).resolves.toBeUndefined();
      await expect(
        oldEditForm.props.onSubmit({ ...oldEditForm.props.initialValues, title: "Must stay inert" })
      ).resolves.toBeUndefined();
      await expect(oldMoveForm.props.onMove(workProject.id)).resolves.toBeUndefined();

      expect(mutationState.complete).not.toHaveBeenCalled();
      expect(mutationState.update).not.toHaveBeenCalled();
      expect(mutationState.move).not.toHaveBeenCalled();
      expect(clearError).not.toHaveBeenCalled();
      expect(revalidate).not.toHaveBeenCalled();
    }
  );

  it("does not revive an authoritatively retired task from a later stale snapshot", () => {
    renderTaskList();
    queryState = {
      data: readModel({ tasks: [], sections: [] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    renderTaskList();

    queryState = {
      data: readModel({ freshness: "stale", warning: "Cached tasks are shown." }),
      error: new NetworkError("PRIVATE stale snapshot"),
      isLoading: false,
      isRefreshing: true,
      revalidate,
    };
    const staleRow = domainRows(renderTaskList())[0];

    expect(staleRow.props.onComplete).toBeUndefined();
    expect(staleRow.props.onReopen).toBeUndefined();
    expect(staleRow.props.onEdit).toBeUndefined();
    expect(staleRow.props.onMove).toBeUndefined();
    expect(staleRow.props.onRefresh).toEqual(expect.any(Function));
  });

  it.each(["complete", "reopen", "update", "move"] as const)(
    "gates every mutation handler while %s is pending for an open task",
    (pendingKind) => {
      (mutationState.isPending as ReturnType<typeof vi.fn>).mockImplementation(
        (_task: Task, kind: string) => kind === pendingKind
      );

      const row = domainRows(renderTaskList())[0];

      expect(row.props.onComplete).toBeUndefined();
      expect(row.props.onReopen).toBeUndefined();
      expect(row.props.onEdit).toBeUndefined();
      expect(row.props.onMove).toBeUndefined();
      expect(row.props.onRefresh).toEqual(expect.any(Function));
    }
  );

  it("gates Reopen and every other mutation while any kind is pending for a completed task", () => {
    const completed = { ...firstTask, status: "completed" as const };
    queryState = {
      data: readModel({ tasks: [completed], sections: [{ id: "tasks", title: "Tasks", tasks: [completed] }] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    filterState = { ...filterState, filters: { searchText: "", status: "all" } };
    (mutationState.isPending as ReturnType<typeof vi.fn>).mockImplementation(
      (_task: Task, kind: string) => kind === "update"
    );

    const row = domainRows(renderTaskList())[0];

    expect(row.props.onComplete).toBeUndefined();
    expect(row.props.onReopen).toBeUndefined();
    expect(row.props.onEdit).toBeUndefined();
    expect(row.props.onMove).toBeUndefined();
  });

  it("manual row Refresh runs once and clears a normalized mutation error only after refresh", async () => {
    const handler = domainRows(renderTaskList())[0].props.onRefresh as () => Promise<void>;

    await handler();

    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(revalidate.mock.invocationCallOrder[0]).toBeLessThan(clearError.mock.invocationCallOrder[0]);
  });
});

describe("move and edit navigation", () => {
  it("pushes MoveTaskForm and pops only after one confirmed move and revalidation", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    (mutationState.move as ReturnType<typeof vi.fn>).mockResolvedValue(moved);
    const row = domainRows(renderTaskList())[0];

    row.props.onMove?.();
    const form = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);
    await form.props.onMove(workProject.id);

    expect(form.props.currentProjectId).toBe(firstTask.projectId);
    expect(form.props.projects).toBe(queryState.data?.projects);
    expect(mutationState.move).toHaveBeenCalledWith(firstTask, workProject.id);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
    expect(revalidate.mock.invocationCallOrder[0]).toBeLessThan(boundary.navigation.pop.mock.invocationCallOrder[0]);
  });

  it("keeps MoveTaskForm open and propagates a rejected move without refresh", async () => {
    const failure = new Error("PRIVATE rejected move");
    (mutationState.move as ReturnType<typeof vi.fn>).mockRejectedValue(failure);
    domainRows(renderTaskList())[0].props.onMove?.();
    const form = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);

    await expect(form.props.onMove(workProject.id)).rejects.toBe(failure);

    expect(revalidate).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
    expect(boundary.navigation.pop).not.toHaveBeenCalled();
  });

  it.each(["refresh rejection", "sync pop failure", "async pop failure"] as const)(
    "latches a confirmed move before best-effort %s",
    async (failureMode) => {
      const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
      (mutationState.move as ReturnType<typeof vi.fn>).mockResolvedValue(moved);
      if (failureMode === "refresh rejection") {
        revalidate.mockRejectedValue(new Error("PRIVATE move refresh failure"));
      } else if (failureMode === "sync pop failure") {
        boundary.navigation.pop.mockImplementation(() => {
          throw new Error("PRIVATE synchronous pop failure");
        });
      } else {
        const rejectedPop = Promise.reject(new Error("PRIVATE asynchronous pop failure"));
        void rejectedPop.catch(() => undefined);
        boundary.navigation.pop.mockReturnValue(rejectedPop);
      }
      domainRows(renderTaskList())[0].props.onMove?.();
      const form = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);

      await expect(form.props.onMove(workProject.id)).resolves.toBeUndefined();
      await expect(form.props.onMove(workProject.id)).resolves.toBeUndefined();

      expect(mutationState.move).toHaveBeenCalledTimes(1);
      expect(clearError).toHaveBeenCalledTimes(1);
      expect(revalidate).toHaveBeenCalledTimes(1);
      expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
    }
  );

  it("pushes an edit baseline and pops a no-op edit without network or mutation", async () => {
    const row = domainRows(renderTaskList())[0];
    row.props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    expect(form.props.mode).toBe("edit");
    expect(form.props.initialValues).toMatchObject({ title: firstTask.title, projectId: firstTask.projectId });
    expect(form.props.fieldAvailability).toMatchObject({ project: true });
    await form.props.onSubmit(form.props.initialValues);

    expect(mutationState.move).not.toHaveBeenCalled();
    expect(mutationState.update).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
  });

  it("allows a no-op edit to retry only best-effort navigation pop", async () => {
    boundary.navigation.pop
      .mockImplementationOnce(() => {
        throw new Error("PRIVATE no-op pop failure");
      })
      .mockImplementationOnce(() => undefined);
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await expect(form.props.onSubmit(form.props.initialValues)).resolves.toBeUndefined();
    await expect(form.props.onSubmit(form.props.initialValues)).resolves.toBeUndefined();

    expect(mutationState.move).not.toHaveBeenCalled();
    expect(mutationState.update).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(2);
  });

  it("moves first, updates the confirmed moved task, then refreshes and pops", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    const updated = { ...moved, title: "Edited title" };
    (mutationState.move as ReturnType<typeof vi.fn>).mockResolvedValue(moved);
    (mutationState.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: workProject.id });

    expect(mutationState.move).toHaveBeenCalledWith(firstTask, workProject.id);
    expect(mutationState.update).toHaveBeenCalledWith(moved, { title: "Edited title" });
    expect((mutationState.move as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
      (mutationState.update as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
    );
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
  });

  it("continues the active edit transaction when move confirmation retires the original row before continuation", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    const updated = { ...moved, title: "Edited title" };
    (mutationState.move as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      queryState = {
        data: readModel({ tasks: [moved], sections: [{ id: "tasks", title: "Tasks", tasks: [moved] }] }),
        isLoading: false,
        isRefreshing: false,
        revalidate,
      };
      renderTaskList();
      return moved;
    });
    (mutationState.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await expect(
      form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: workProject.id })
    ).resolves.toBeUndefined();

    expect(mutationState.move).toHaveBeenCalledTimes(1);
    expect(mutationState.move).toHaveBeenCalledWith(firstTask, workProject.id);
    expect(mutationState.update).toHaveBeenCalledTimes(1);
    expect(mutationState.update).toHaveBeenCalledWith(moved, { title: "Edited title" });
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
  });

  it("abandons an in-flight edit transaction when its execution scope changes during move", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    const nextRuntime = readyRuntime({
      taskService: Object.freeze({ kind: "next-task-service" }) as unknown as TickTickService,
    });
    (mutationState.move as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      renderTaskList(props(SEARCH_COMMAND, nextRuntime));
      return moved;
    });
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await expect(
      form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: workProject.id })
    ).resolves.toBeUndefined();

    expect(mutationState.move).toHaveBeenCalledTimes(1);
    expect(mutationState.update).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(boundary.navigation.pop).not.toHaveBeenCalled();
  });

  it("persists a confirmed move so a retryable update failure does not replay it", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    const updated = { ...moved, title: "Edited title" };
    const updateFailure = new NetworkError("PRIVATE retryable update failure");
    (mutationState.move as ReturnType<typeof vi.fn>).mockResolvedValue(moved);
    (mutationState.update as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(updateFailure)
      .mockResolvedValueOnce(updated);
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);
    const desired = { ...form.props.initialValues, title: "Edited title", projectId: workProject.id };

    await expect(form.props.onSubmit(desired)).rejects.toBe(updateFailure);
    await expect(form.props.onSubmit(desired)).resolves.toBeUndefined();

    expect(mutationState.move).toHaveBeenCalledTimes(1);
    expect(mutationState.move).toHaveBeenCalledWith(firstTask, workProject.id);
    expect(mutationState.update).toHaveBeenCalledTimes(2);
    expect(mutationState.update).toHaveBeenNthCalledWith(1, moved, { title: "Edited title" });
    expect(mutationState.update).toHaveBeenNthCalledWith(2, moved, { title: "Edited title" });
  });

  it("compares a changed-back desired project with the last confirmed moved task", async () => {
    const moved = { ...firstTask, projectId: workProject.id, projectName: workProject.name };
    const movedBack = { ...firstTask, projectId: inboxProject.id, projectName: inboxProject.name };
    const updateFailure = new NetworkError("PRIVATE retryable update failure");
    (mutationState.move as ReturnType<typeof vi.fn>).mockResolvedValueOnce(moved).mockResolvedValueOnce(movedBack);
    (mutationState.update as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(updateFailure)
      .mockResolvedValueOnce({ ...movedBack, title: "Edited title" });
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await expect(
      form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: workProject.id })
    ).rejects.toBe(updateFailure);
    await expect(
      form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: inboxProject.id })
    ).resolves.toBeUndefined();

    expect(mutationState.move).toHaveBeenNthCalledWith(1, firstTask, workProject.id);
    expect(mutationState.move).toHaveBeenNthCalledWith(2, moved, inboxProject.id);
    expect(mutationState.update).toHaveBeenLastCalledWith(movedBack, { title: "Edited title" });
  });

  it("latches a confirmed edit before best-effort refresh and pop failures", async () => {
    const updated = { ...firstTask, title: "Edited title" };
    (mutationState.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    revalidate.mockRejectedValue(new Error("PRIVATE edit refresh failure"));
    boundary.navigation.pop.mockImplementation(() => {
      throw new Error("PRIVATE edit pop failure");
    });
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);
    const desired = { ...form.props.initialValues, title: "Edited title" };

    await expect(form.props.onSubmit(desired)).resolves.toBeUndefined();
    await expect(form.props.onSubmit(desired)).resolves.toBeUndefined();

    expect(mutationState.update).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(boundary.navigation.pop).toHaveBeenCalledTimes(1);
  });

  it("never updates, refreshes, clears, or pops after the edit move step rejects", async () => {
    const failure = new Error("PRIVATE edit move rejected");
    (mutationState.move as ReturnType<typeof vi.fn>).mockRejectedValue(failure);
    domainRows(renderTaskList())[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    await expect(
      form.props.onSubmit({ ...form.props.initialValues, title: "Edited title", projectId: workProject.id })
    ).rejects.toBe(failure);

    expect(mutationState.update).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
    expect(boundary.navigation.pop).not.toHaveBeenCalled();
  });

  it("hides the Edit handler when a safe baseline cannot be built", () => {
    const invalid = { ...firstTask, timeZone: "PRIVATE/not-a-zone" };
    queryState = {
      data: readModel({ tasks: [invalid], sections: [{ id: "tasks", title: "Tasks", tasks: [invalid] }] }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };

    const row = domainRows(renderTaskList())[0];

    expect(row.props.model.actions.map((action) => action.key)).toContain("edit");
    expect(row.props.onEdit).toBeUndefined();
  });

  it("normalizes a hostile project edit back to source when move is unsupported", async () => {
    const capabilities = { ...fullCapabilities, move: false };
    domainRows(renderTaskList(props(SEARCH_COMMAND, readyRuntime({ capabilities }))))[0].props.onEdit?.();
    const form = formPushed<TaskFormProps>(boundary.MockTaskForm);

    expect(form.props.fieldAvailability).toMatchObject({ project: false });
    await form.props.onSubmit({ ...form.props.initialValues, title: "Edited only", projectId: workProject.id });

    expect(mutationState.move).not.toHaveBeenCalled();
    expect(mutationState.update).toHaveBeenCalledWith(firstTask, { title: "Edited only" });
  });
});

describe("normalized mutation recovery", () => {
  it("renders only normalized title/message and a manual Retry that refreshes after success", async () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Couldn't Update Task",
        message: "TickTick couldn't update this task.",
        canRetry: true,
        refreshRequired: false,
      },
    };
    const root = renderTaskList();
    const [row] = mutationRows(root);
    const [retry] = panelActions(row.props.actions);

    expect(row.props).toMatchObject({
      id: "ticktick-mutation-error",
      title: "Couldn't Update Task",
      subtitle: "TickTick couldn't update this task.",
      icon: Icon.ExclamationMark,
    });
    expect(retry.props.title).toBe("Retry");
    expect(retry.props.shortcut).toMatchObject({ Windows: { modifiers: ["ctrl"], key: "r" } });
    if (retry.props.shortcut && "Windows" in retry.props.shortcut) {
      expect(retry.props.shortcut.Windows.modifiers).not.toContain("cmd");
    }
    revalidate.mockRejectedValue(new Error("PRIVATE retry refresh failure"));
    await expect(retry.props.onAction?.()).resolves.toBeUndefined();
    expect(mutationState.retry).toHaveBeenCalledTimes(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(clearError.mock.invocationCallOrder[0]).toBeLessThan(revalidate.mock.invocationCallOrder[0]);
  });

  it("gates every task mutation for a refresh-required error until tracked fresh evidence is observed", async () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    const firstRoot = renderTaskList();
    const blocked = domainRows(firstRoot)[0];
    const [row] = mutationRows(firstRoot);
    const actions = panelActions(row.props.actions);

    expect(actions.map((action) => action.props.title)).toEqual(["Refresh"]);
    expect(blocked.props.onComplete).toBeUndefined();
    expect(blocked.props.onReopen).toBeUndefined();
    expect(blocked.props.onEdit).toBeUndefined();
    expect(blocked.props.onMove).toBeUndefined();
    await actions[0].props.onAction?.();
    expect(mutationState.retry).not.toHaveBeenCalled();
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).not.toHaveBeenCalled();

    const recovered = domainRows(renderTaskList())[0];

    expect(clearError).toHaveBeenCalledTimes(1);
    expect(recovered.props.onComplete).toEqual(expect.any(Function));
    expect(recovered.props.onEdit).toEqual(expect.any(Function));
    expect(recovered.props.onMove).toEqual(expect.any(Function));
  });

  it("does not accept an untracked resolved revalidation as refresh-required recovery evidence", async () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    renderTaskList();

    await revalidate();
    const stillBlocked = domainRows(renderTaskList())[0];

    expect(clearError).not.toHaveBeenCalled();
    expect(stillBlocked.props.onComplete).toBeUndefined();
    expect(stillBlocked.props.onEdit).toBeUndefined();
    expect(stillBlocked.props.onMove).toBeUndefined();
  });

  it("blocks a previously captured mutation handler after refresh-required state is observed", async () => {
    const capturedComplete = domainRows(renderTaskList())[0].props.onComplete as () => Promise<void>;
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    renderTaskList();

    await expect(capturedComplete()).resolves.toBeUndefined();

    expect(mutationState.complete).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("blocks already-open edit and move forms after refresh-required state is observed", async () => {
    const row = domainRows(renderTaskList())[0];
    row.props.onMove?.();
    const moveForm = formPushed<MoveTaskFormProps>(boundary.MockMoveTaskForm);
    row.props.onEdit?.();
    const editForm = formPushed<TaskFormProps>(boundary.MockTaskForm);
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    renderTaskList();

    await expect(moveForm.props.onMove(workProject.id)).resolves.toBeUndefined();
    await expect(
      editForm.props.onSubmit({ ...editForm.props.initialValues, title: "Must not mutate" })
    ).resolves.toBeUndefined();

    expect(mutationState.move).not.toHaveBeenCalled();
    expect(mutationState.update).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
  });

  it.each(["read error", "loading", "refreshing", "stale", "partial", "missing data"] as const)(
    "preserves the refresh-required gate after a tracked refresh with %s",
    async (unhealthyState) => {
      mutationState = {
        ...mutationState,
        error: {
          title: "Task Update Status Unknown",
          message: "Refresh before trying again.",
          canRetry: false,
          refreshRequired: true,
        },
      };
      const [row] = mutationRows(renderTaskList());
      const [refresh] = panelActions(row.props.actions);

      await refresh.props.onAction?.();
      if (unhealthyState === "read error") {
        queryState = {
          data: readModel(),
          error: new NetworkError("PRIVATE retained refresh error"),
          isLoading: false,
          isRefreshing: false,
          revalidate,
        };
      } else if (unhealthyState === "loading") {
        queryState = { data: readModel(), isLoading: true, isRefreshing: false, revalidate };
      } else if (unhealthyState === "refreshing") {
        queryState = { data: readModel(), isLoading: false, isRefreshing: true, revalidate };
      } else if (unhealthyState === "stale") {
        queryState = {
          data: readModel({ freshness: "stale" }),
          isLoading: false,
          isRefreshing: false,
          revalidate,
        };
      } else if (unhealthyState === "partial") {
        queryState = {
          data: readModel({ isPartial: true, failedProjectIds: [workProject.id] }),
          isLoading: false,
          isRefreshing: false,
          revalidate,
        };
      } else {
        queryState = { isLoading: false, isRefreshing: false, revalidate };
      }

      const root = renderTaskList();

      expect(clearError).not.toHaveBeenCalled();
      for (const taskRow of domainRows(root)) {
        expect(taskRow.props.onComplete).toBeUndefined();
        expect(taskRow.props.onReopen).toBeUndefined();
        expect(taskRow.props.onEdit).toBeUndefined();
        expect(taskRow.props.onMove).toBeUndefined();
      }
    }
  );

  it("requires another tracked attempt after settled refresh evidence is observed unhealthy", async () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    const [errorRow] = mutationRows(renderTaskList());
    const [refresh] = panelActions(errorRow.props.actions);

    await refresh.props.onAction?.();
    queryState = {
      data: readModel({ freshness: "stale" }),
      isLoading: false,
      isRefreshing: false,
      revalidate,
    };
    renderTaskList();

    queryState = { data: readModel(), isLoading: false, isRefreshing: false, revalidate };
    const stillBlocked = domainRows(renderTaskList())[0];
    expect(stillBlocked.props.onComplete).toBeUndefined();
    expect(clearError).not.toHaveBeenCalled();

    const [nextErrorRow] = mutationRows(renderTaskList());
    const [nextRefresh] = panelActions(nextErrorRow.props.actions);
    await nextRefresh.props.onAction?.();
    const recovered = domainRows(renderTaskList())[0];

    expect(revalidate).toHaveBeenCalledTimes(2);
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(recovered.props.onComplete).toEqual(expect.any(Function));
  });

  it("preserves the refresh-required gate when a tracked refresh rejects", async () => {
    const failure = new Error("PRIVATE tracked refresh failure");
    revalidate.mockRejectedValue(failure);
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    const [row] = mutationRows(renderTaskList());
    const [refresh] = panelActions(row.props.actions);

    await expect(refresh.props.onAction?.()).rejects.toBe(failure);
    const stillBlocked = domainRows(renderTaskList())[0];

    expect(clearError).not.toHaveBeenCalled();
    expect(stillBlocked.props.onComplete).toBeUndefined();
    expect(stillBlocked.props.onEdit).toBeUndefined();
    expect(stillBlocked.props.onMove).toBeUndefined();
  });

  it("tracks automatic refresh-required recovery through the same settled evidence gate", async () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Task Update Status Unknown",
        message: "Refresh before trying again.",
        canRetry: false,
        refreshRequired: true,
      },
    };
    renderTaskList();
    const options = boundary.useTaskMutation.mock.calls.at(-1)?.[2] as
      | { onRefreshRequired?: () => void | Promise<void> }
      | undefined;

    await options?.onRefreshRequired?.();
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(clearError).not.toHaveBeenCalled();

    const recovered = domainRows(renderTaskList())[0];

    expect(clearError).toHaveBeenCalledTimes(1);
    expect(recovered.props.onComplete).toEqual(expect.any(Function));
    expect(recovered.props.onEdit).toEqual(expect.any(Function));
  });

  it("does not auto-retry, refresh, clear, or schedule a timer merely by rendering an error", () => {
    mutationState = {
      ...mutationState,
      error: {
        title: "Couldn't Update Task",
        message: "Review the task and try again.",
        canRetry: false,
        refreshRequired: false,
      },
    };

    const [row] = mutationRows(renderTaskList());

    expect(panelActions(row.props.actions)).toEqual([]);
    expect(mutationState.retry).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(clearError).not.toHaveBeenCalled();
  });
});

describe("privacy, immutability, and dependency boundary", () => {
  it("does not mutate frozen config, runtime, capabilities, projects, sections, or tasks", () => {
    const config = Object.freeze({ ...SEARCH_COMMAND, query: Object.freeze({ ...SEARCH_COMMAND.query }) });
    const capabilities = Object.freeze({ ...fullCapabilities });
    const runtime = readyRuntime({ capabilities });
    const data = queryState.data as TaskReadModel;
    const before = JSON.stringify({ config, capabilities, data });

    renderTaskList(props(config, runtime));

    expect(JSON.stringify({ config, capabilities, data })).toBe(before);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(capabilities)).toBe(true);
  });

  it("keeps the production slice free of legacy, concrete backend, network, logging, timers, and raw storage", () => {
    const source = readFileSync(resolve(__dirname, "TaskListView.tsx"), "utf8");

    expect(source).not.toMatch(/\.\.\/service|taskItem|osScript|SearchFilter/);
    expect(source).not.toMatch(/McpTickTickBackend|OpenApiTickTickBackend|MacOS|BackendFactory|createBackend/);
    expect(source).not.toMatch(/\bfetch\s*\(|console\.|setTimeout|setInterval/);
    expect(source).not.toMatch(/\bLocalStorage\b/);
    expect(source).not.toMatch(/searchText\s*:.*remote|projectId\s*:.*remote/);
  });
});

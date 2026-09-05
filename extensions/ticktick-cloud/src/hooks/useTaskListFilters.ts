import { useCallback, useEffect, useRef, useState } from "react";

import type { TaskViewQuery } from "../application/viewQuery";
import {
  applyCombinedTaskFilterSelection,
  buildCombinedTaskFilter,
  resolveTaskListFilters,
  type CombinedTaskFilterModel,
  type TaskListFilters,
} from "../components/taskListModel";
import type { Project } from "../domain/project";
import {
  TaskFilterPreferenceStore,
  type PersistedSearchFilters,
  type TaskFilterStoragePort,
} from "../platform/taskFilterPreferences";

export type TaskListFilterMode = "search" | "ephemeral";

export interface UseTaskListFiltersOptions {
  readonly mode: TaskListFilterMode;
  readonly defaultStatus: TaskViewQuery["status"];
  readonly projects: readonly Project[];
  readonly catalogAuthoritative: boolean;
  readonly completedQuery: boolean;
  readonly contextKey: string;
  readonly storage?: TaskFilterStoragePort;
}

export interface TaskListFilterState {
  readonly filters: Readonly<TaskListFilters>;
  readonly filtersReady: boolean;
  readonly combinedFilter: Readonly<CombinedTaskFilterModel>;
  setSearchText(value: string): void;
  selectCombinedFilter(value: string): void;
}

interface FilterContext {
  readonly contextKey: string;
  readonly mode: TaskListFilterMode;
  readonly storage?: TaskFilterStoragePort;
  readonly store?: TaskFilterPreferenceStore;
}

interface InternalFilterState {
  readonly context: FilterContext;
  readonly filters: TaskListFilters;
  readonly filtersReady: boolean;
}

interface LatestFilterSnapshot extends InternalFilterState {
  readonly options: UseTaskListFiltersOptions;
}

interface StoreBinding {
  readonly storage: TaskFilterStoragePort;
  readonly store: TaskFilterPreferenceStore;
}

interface SelectionRevision {
  readonly context: FilterContext;
  readonly value: number;
}

export function useTaskListFilters(options: UseTaskListFiltersOptions): TaskListFilterState {
  const mountedRef = useRef(true);
  const storeBindingRef = useRef<StoreBinding | undefined>(undefined);
  const contextRef = useRef<FilterContext | undefined>(undefined);

  const store = resolveStore(options, storeBindingRef);
  if (!sameContext(contextRef.current, options, store)) {
    contextRef.current = {
      contextKey: options.contextKey,
      mode: options.mode,
      ...(options.storage === undefined ? {} : { storage: options.storage }),
      ...(store === undefined ? {} : { store }),
    };
  }
  const renderContext = contextRef.current;
  const selectionRevisionRef = useRef<SelectionRevision>({ context: renderContext, value: 0 });
  if (selectionRevisionRef.current.context !== renderContext) {
    selectionRevisionRef.current = { context: renderContext, value: 0 };
  }
  const initial = createInitialState(renderContext, options);
  const [state, setState] = useState<InternalFilterState>(() => initial);
  const visibleState = state.context === renderContext ? state : initial;
  const latestRef = useRef<LatestFilterSnapshot>({ ...visibleState, options });
  latestRef.current = { ...visibleState, options };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const context = renderContext;
    let active = true;
    const latest = latestRef.current;
    const startingState =
      latest.context === context
        ? { context, filters: latest.filters, filtersReady: latest.filtersReady }
        : createInitialState(context, options);
    latestRef.current = {
      ...startingState,
      options: latest.context === context ? latest.options : options,
    };
    setState(startingState);

    if (context.mode !== "search" || !context.store) {
      return () => {
        active = false;
      };
    }
    const preferenceStore = context.store;

    void preferenceStore.load().then((loaded) => {
      if (!active || !isCurrentContext(mountedRef, contextRef, context)) return;

      const latest = latestRef.current;
      if (latest.context !== context) return;
      const requested: TaskListFilters =
        selectionRevisionRef.current.context === context && selectionRevisionRef.current.value > 0
          ? latest.filters
          : {
              searchText: latest.filters.searchText,
              status: loaded.status,
              ...(loaded.projectId === undefined ? {} : { projectId: loaded.projectId }),
            };
      const canonical = canonicalize(requested, latest.options);
      const next: InternalFilterState = { context, filters: canonical, filtersReady: true };
      latestRef.current = { ...next, options: latest.options };
      setState(next);

      if (!samePersistedSelection(requested, canonical)) {
        void preferenceStore.write(persistedSelection(canonical));
      }
    });

    return () => {
      active = false;
    };
  }, [renderContext]);

  useEffect(() => {
    const context = renderContext;
    if (!isCurrentContext(mountedRef, contextRef, context) || !options.catalogAuthoritative) return;

    const latest = latestRef.current;
    if (latest.context !== context || !latest.filtersReady) return;
    const canonical = canonicalize(latest.filters, options);
    if (sameFilters(latest.filters, canonical)) return;

    const next: InternalFilterState = { context, filters: canonical, filtersReady: true };
    latestRef.current = { ...next, options };
    setState(next);
    if (context.mode === "search" && context.store) {
      void context.store.write(persistedSelection(canonical));
    }
  }, [renderContext, options.catalogAuthoritative, options.completedQuery, options.projects]);

  const setSearchText = useCallback(
    (searchText: string): void => {
      if (!isCurrentContext(mountedRef, contextRef, renderContext)) return;
      const latest = latestRef.current;
      if (latest.context !== renderContext || latest.filters.searchText === searchText) return;

      const next: InternalFilterState = {
        context: renderContext,
        filters: { ...latest.filters, searchText },
        filtersReady: latest.filtersReady,
      };
      latestRef.current = { ...next, options: latest.options };
      setState(next);
    },
    [renderContext]
  );

  const selectCombinedFilter = useCallback(
    (selectedValue: string): void => {
      if (!isCurrentContext(mountedRef, contextRef, renderContext)) return;
      const latest = latestRef.current;
      if (latest.context !== renderContext) return;

      const dropdown = createCombinedFilter(latest.filters, latest.options);
      const selected = applyCombinedTaskFilterSelection(latest.filters, dropdown, selectedValue);
      if (sameFilters(latest.filters, selected)) return;

      const next: InternalFilterState = {
        context: renderContext,
        filters: selected,
        filtersReady: latest.filtersReady,
      };
      selectionRevisionRef.current = {
        context: renderContext,
        value: selectionRevisionRef.current.value + 1,
      };
      latestRef.current = { ...next, options: latest.options };
      setState(next);

      if (renderContext.mode === "search" && renderContext.store) {
        void renderContext.store.write(persistedSelection(selected));
      }
    },
    [renderContext]
  );

  return {
    filters: visibleState.filters,
    filtersReady: visibleState.filtersReady,
    combinedFilter: createCombinedFilter(visibleState.filters, options),
    setSearchText,
    selectCombinedFilter,
  };
}

function resolveStore(
  options: UseTaskListFiltersOptions,
  bindingRef: { current: StoreBinding | undefined }
): TaskFilterPreferenceStore | undefined {
  if (options.mode !== "search" || !options.storage) return undefined;
  if (bindingRef.current?.storage !== options.storage) {
    bindingRef.current = { storage: options.storage, store: new TaskFilterPreferenceStore(options.storage) };
  }
  return bindingRef.current.store;
}

function sameContext(
  context: FilterContext | undefined,
  options: UseTaskListFiltersOptions,
  store: TaskFilterPreferenceStore | undefined
): context is FilterContext {
  return (
    context !== undefined &&
    context.contextKey === options.contextKey &&
    context.mode === options.mode &&
    context.storage === options.storage &&
    context.store === store
  );
}

function createInitialState(context: FilterContext, options: UseTaskListFiltersOptions): InternalFilterState {
  return {
    context,
    filters: canonicalize({ searchText: "", status: options.defaultStatus }, options),
    filtersReady: context.mode !== "search" || context.store === undefined,
  };
}

function canonicalize(filters: TaskListFilters, options: UseTaskListFiltersOptions): TaskListFilters {
  return resolveTaskListFilters(
    filters,
    options.projects,
    { completedQuery: options.catalogAuthoritative ? options.completedQuery : true },
    options.catalogAuthoritative
  );
}

function createCombinedFilter(filters: TaskListFilters, options: UseTaskListFiltersOptions): CombinedTaskFilterModel {
  const completedQuery = options.catalogAuthoritative ? options.completedQuery : true;
  return buildCombinedTaskFilter(filters, projectsForDropdown(filters, options), completedQuery);
}

function projectsForDropdown(filters: TaskListFilters, options: UseTaskListFiltersOptions): readonly Project[] {
  if (
    options.catalogAuthoritative ||
    filters.projectId === undefined ||
    options.projects.some((project) => project.id === filters.projectId && !project.closed)
  ) {
    return options.projects;
  }

  const placeholder: Project = {
    id: filters.projectId,
    name: "Selected List",
    kind: "project",
    closed: false,
  };
  return [...options.projects, placeholder];
}

function persistedSelection(filters: TaskListFilters): PersistedSearchFilters {
  return filters.projectId === undefined
    ? { status: filters.status }
    : { status: filters.status, projectId: filters.projectId };
}

function samePersistedSelection(left: TaskListFilters, right: TaskListFilters): boolean {
  return left.status === right.status && left.projectId === right.projectId;
}

function sameFilters(left: TaskListFilters, right: TaskListFilters): boolean {
  return left.searchText === right.searchText && left.status === right.status && left.projectId === right.projectId;
}

function isCurrentContext(
  mountedRef: { current: boolean },
  contextRef: { current: FilterContext | undefined },
  expected: FilterContext
): boolean {
  return mountedRef.current && contextRef.current === expected;
}

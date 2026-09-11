import { Action, ActionPanel, Detail, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import * as google from "../api/oauth";
import {
  createTask,
  deleteTask,
  editTask,
  fetchList,
  fetchListPage,
  fetchLists,
  setTaskStatus,
  toggleTask,
} from "../api/endpoints";
import { EditableTask, TaskForm, TaskList, TaskWithList } from "../types";
import { dueDay, isCompleted, todayValue } from "../utils";
import AuthRecoveryView from "./AuthRecoveryView";
import CreateTaskForm from "./CreateTaskForm";
import EditTaskForm from "./EditTaskForm";
import TaskItem from "./TaskItem";

const selectionKey = "task-view-selection-v2";
const allOpen = "all-open";
const today = "today";
const upcoming = "upcoming";
const noDate = "no-date";
const completed = "completed";
const sortKey = "task-view-sort";
const myOrder = "my-order";
const date = "date";
const undoDurationMs = 5000;
const manualOrderTitle = "Manual order";
const scheduledDateTitle = "Scheduled date";

function sectionTitle(task: TaskWithList): string {
  const due = dueDay(task.due);
  if (!due) return "No Date";
  if (due < todayValue()) return "Overdue";
  if (due === todayValue()) return "Today";
  return "Upcoming";
}

function matchesSelection(task: TaskWithList, selection: string): boolean {
  const due = dueDay(task.due);
  if (selection === allOpen) return !isCompleted(task);
  if (selection === today) return !isCompleted(task) && !!due && due <= todayValue();
  if (selection === upcoming) return !isCompleted(task) && !!due && due > todayValue();
  if (selection === noDate) return !isCompleted(task) && !due;
  if (selection === completed) return isCompleted(task);
  return task.listId === selection && !isCompleted(task);
}

function sortByCompletion(tasks: TaskWithList[]): TaskWithList[] {
  return tasks.sort(
    (a, b) => (b.completed ? new Date(b.completed).getTime() : 0) - (a.completed ? new Date(a.completed).getTime() : 0),
  );
}

function sortTasks(tasks: TaskWithList[], sort: string): TaskWithList[] {
  const byMyOrder = (a: TaskWithList, b: TaskWithList) =>
    a.listId === b.listId && a.position && b.position ? a.position.localeCompare(b.position) : 0;
  if (sort === myOrder) return tasks.sort(byMyOrder);

  const today = todayValue();
  return tasks.sort((a, b) => {
    const aDue = dueDay(a.due);
    const bDue = dueDay(b.due);
    if (!aDue && !bDue) return byMyOrder(a, b);
    if (!aDue) return 1;
    if (!bDue) return -1;

    const aIsOverdue = aDue < today;
    const bIsOverdue = bDue < today;
    if (aIsOverdue && bIsOverdue) return bDue.localeCompare(aDue);
    if (aIsOverdue) return -1;
    if (bIsOverdue) return 1;
    return aDue.localeCompare(bDue);
  });
}

export default function UnifiedTaskView() {
  // Mount the List only when its selection and all dropdown options are ready.
  const [view, setView] = useState<{ lists: TaskList[]; selection: string }>();
  const { lists = [], selection = allOpen } = view ?? {};
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const [completedPageTokens, setCompletedPageTokens] = useState<Record<string, string | undefined>>({});
  const [lastCompletedTask, setLastCompletedTask] = useState<TaskWithList>();
  const [loadError, setLoadError] = useState<google.AuthorizationErrorDetails>();
  const [sort, setSort] = useState(myOrder);
  const loadVersion = useRef(0);
  const hasLoadedView = useRef(false);
  const load = useCallback(async (nextSelection?: string, forceReconnect = false) => {
    const version = ++loadVersion.current;
    try {
      setIsLoading(true);
      setLoadError(undefined);
      const requestedSelection = nextSelection ?? (await LocalStorage.getItem<string>(selectionKey)) ?? allOpen;
      const didAuthorize = forceReconnect ? await google.reconnect() : await google.authorize();
      const overlay = didAuthorize ? google.dismissAuthorizationOverlay() : Promise.resolve();
      const fetchedLists = await fetchLists();
      if (version !== loadVersion.current) return;
      const resolvedSelection =
        [allOpen, today, upcoming, noDate, completed].includes(requestedSelection) ||
        fetchedLists.some((list) => list.id === requestedSelection)
          ? requestedSelection
          : allOpen;
      const showCompleted = resolvedSelection === completed;
      const fetchedTasks = await Promise.all(
        fetchedLists.map(async (list) => {
          const page = showCompleted
            ? await fetchListPage(list.id, true)
            : { tasks: await fetchList(list.id), nextPageToken: undefined };
          return { list, page };
        }),
      );
      if (version !== loadVersion.current) return;
      await overlay;
      if (version !== loadVersion.current) return;
      const nextTasks = fetchedTasks.flatMap(({ list, page }) =>
        page.tasks.map((task) => ({ ...task, listId: list.id, listTitle: list.title })),
      );
      setView({ lists: fetchedLists, selection: resolvedSelection });
      hasLoadedView.current = true;
      setTasks(showCompleted ? sortByCompletion(nextTasks) : nextTasks);
      setCompletedPageTokens(
        Object.fromEntries(
          fetchedTasks.map(({ list, page }) => [list.id, page.nextPageToken]).filter(([, pageToken]) => pageToken),
        ),
      );
    } catch (error) {
      if (version !== loadVersion.current) return;
      console.error(error);
      const details = google.describeAuthorizationError(error);
      setLoadError(details);
      if (hasLoadedView.current) {
        showToast({ style: Toast.Style.Failure, title: "Could not refresh tasks", message: details.message });
      }
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
    };
  }, [load]);

  useEffect(() => {
    void LocalStorage.getItem<string>(sortKey).then((savedSort) => setSort(savedSort === date ? date : myOrder));
  }, []);

  useEffect(() => {
    if (!lastCompletedTask) return;
    const timeout = setTimeout(() => setLastCompletedTask(undefined), undoDurationMs);
    return () => clearTimeout(timeout);
  }, [lastCompletedTask]);

  const changeSelection = useCallback(
    async (nextSelection: string) => {
      if (!view || nextSelection === selection) return;
      try {
        await LocalStorage.setItem(selectionKey, nextSelection);
        await load(nextSelection);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Could not save task view", message: String(error) });
      }
    },
    [load, view, selection],
  );

  const refresh = useCallback(() => load(), [load]);
  const changeSort = useCallback((nextSort: string) => {
    setSort(nextSort);
    void LocalStorage.setItem(sortKey, nextSort);
  }, []);
  const handleCreate = useCallback(
    async (listId: string, task: TaskForm) => {
      await createTask(listId, task);
      await refresh();
    },
    [refresh],
  );
  const handleEdit = useCallback(
    (listId: string, task: EditableTask) => {
      void editTask(listId, task)
        .then(refresh)
        .catch((error) => showToast({ style: Toast.Style.Failure, title: String(error) }));
    },
    [refresh],
  );
  const handleUndoCompletion = useCallback(async () => {
    if (!lastCompletedTask) return;

    try {
      await setTaskStatus(lastCompletedTask.listId, lastCompletedTask, "needsAction");
      setLastCompletedTask(undefined);
      await refresh();
      showToast({ style: Toast.Style.Success, title: "Task reopened" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not undo completion", message: String(error) });
    }
  }, [lastCompletedTask, refresh]);
  const handleToggle = useCallback(
    async (task: TaskWithList) => {
      const wasCompleted = isCompleted(task);
      try {
        await toggleTask(task.listId, task);
        setLastCompletedTask(wasCompleted ? undefined : task);
        await refresh();
        showToast({ style: Toast.Style.Success, title: wasCompleted ? "Task reopened" : "Task completed" });
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    },
    [refresh],
  );
  const handleDelete = useCallback(
    (task: TaskWithList) => {
      void deleteTask(task.listId, task.id)
        .then(refresh)
        .catch((error) => showToast({ style: Toast.Style.Failure, title: String(error) }));
    },
    [refresh],
  );
  const loadMoreCompletedTasks = useCallback(async () => {
    const listsWithMore = lists.filter((list) => completedPageTokens[list.id]);
    if (listsWithMore.length === 0) return;

    try {
      setIsLoading(true);
      const pages = await Promise.all(
        listsWithMore.map(async (list) => ({
          list,
          page: await fetchListPage(list.id, true, completedPageTokens[list.id]),
        })),
      );
      setTasks((current) =>
        sortByCompletion([
          ...current,
          ...pages.flatMap(({ list, page }) =>
            page.tasks.map((task) => ({ ...task, listId: list.id, listTitle: list.title })),
          ),
        ]),
      );
      setCompletedPageTokens(
        Object.fromEntries(
          pages.map(({ list, page }) => [list.id, page.nextPageToken]).filter(([, pageToken]) => pageToken),
        ),
      );
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Could not load more completed tasks", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [completedPageTokens, lists]);

  const visibleTasks = sortTasks(
    tasks.filter((task) => {
      const search = searchText.toLowerCase();
      return (
        matchesSelection(task, selection) &&
        `${task.title} ${task.notes ?? ""} ${task.listTitle}`.toLowerCase().includes(search)
      );
    }),
    sort,
  );
  const sections =
    selection === completed
      ? [{ title: "Completed", tasks: visibleTasks }]
      : sort === myOrder && lists.some((list) => list.id === selection)
        ? [{ title: "Tasks", tasks: visibleTasks }]
        : ["Overdue", "Today", "Upcoming", "No Date"]
            .map((title) => ({ title, tasks: visibleTasks.filter((task) => sectionTitle(task) === title) }))
            .filter((section) => section.tasks.length > 0);

  const sortActions = (
    <ActionPanel.Submenu title="Sort by" icon={Icon.ArrowUp}>
      <Action
        title={manualOrderTitle}
        icon={sort === myOrder ? Icon.Check : undefined}
        onAction={() => changeSort(myOrder)}
      />
      <Action
        title={scheduledDateTitle}
        icon={sort === date ? Icon.Check : undefined}
        onAction={() => changeSort(date)}
      />
    </ActionPanel.Submenu>
  );
  const actions = (task?: TaskWithList) => (
    <ActionPanel>
      {lastCompletedTask ? (
        <Action
          title="Undo Last Completion"
          icon={Icon.ArrowCounterClockwise}
          onAction={() => void handleUndoCompletion()}
        />
      ) : null}
      {task ? (
        <Action
          title={isCompleted(task) ? "Reopen Task" : "Complete Task"}
          icon={isCompleted(task) ? Icon.ArrowClockwise : Icon.CheckCircle}
          onAction={() => handleToggle(task)}
        />
      ) : null}
      <Action
        title={isShowingDetails ? "Hide Details" : "Show Details"}
        icon={isShowingDetails ? Icon.EyeDisabled : Icon.Eye}
        onAction={() => setIsShowingDetails((value) => !value)}
      />
      {task ? (
        <>
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditTaskForm listId={task.listId} task={task} onEdit={handleEdit} />}
          />
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => handleDelete(task)}
          />
        </>
      ) : null}
      {selection === completed && Object.keys(completedPageTokens).length > 0 ? (
        <Action
          title="Load More Completed Tasks"
          icon={Icon.ArrowDown}
          onAction={() => void loadMoreCompletedTasks()}
        />
      ) : null}
      {sortActions}
      <Action.Push
        title="Create Task"
        icon={Icon.NewDocument}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={
          <CreateTaskForm
            listId={lists.some((list) => list.id === selection) ? selection : undefined}
            title={searchText}
            onCreate={handleCreate}
          />
        }
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => void refresh()}
      />
    </ActionPanel>
  );

  // Windows initializes dropdown state when the List mounts. Adding the picker
  // later makes it fall back to its first option and overwrite the saved view.
  if (!view) {
    if (!loadError) {
      return <Detail navigationTitle="View Tasks" isLoading={isLoading} />;
    }
    return (
      <AuthRecoveryView
        title="View Tasks"
        error={loadError}
        onRetry={() => void refresh()}
        onReconnect={() => void load(undefined, true)}
      />
    );
  }

  return (
    <List
      navigationTitle="View Tasks"
      isShowingDetail={isShowingDetails}
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="View Tasks" value={selection} onChange={changeSelection}>
          <List.Dropdown.Section title="Views">
            <List.Dropdown.Item title="All Open" value={allOpen} />
            <List.Dropdown.Item title="Today & Overdue" value={today} />
            <List.Dropdown.Item title="Upcoming" value={upcoming} />
            <List.Dropdown.Item title="No Date" value={noDate} />
            <List.Dropdown.Item title="Completed" value={completed} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Lists">
            {lists.map((list) => (
              <List.Dropdown.Item key={list.id} title={list.title} value={list.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={actions()}
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.tasks.length}`}>
          {section.tasks.map((task) => (
            <TaskItem
              key={`${task.listId}-${task.id}`}
              tasks={tasks}
              task={task}
              showListTitle={!lists.some((list) => list.id === selection)}
              actions={actions(task)}
            />
          ))}
        </List.Section>
      ))}
      {visibleTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title={searchText ? "No Matching Tasks" : "No Tasks Here"}
          description={
            searchText
              ? "Search titles, notes, or task lists, or create a task with this title."
              : "Choose another view or create a task."
          }
          actions={actions()}
        />
      ) : null}
    </List>
  );
}

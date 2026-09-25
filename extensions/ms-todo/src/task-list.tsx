import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  Collection,
  Suggestion,
  TaskListQuery,
  addToMyDay,
  myDaySuggestions,
  TaskList as TodoList,
  listTaskLists,
  listTasks,
  myDay,
  completeTask,
  reopenTask,
} from "./cli";
import QuickAdd from "./quick-add";
import { TaskDetail } from "./task-detail";
import { graphDate, plainNotes } from "./task-display";

type Mode = "search" | "my-day" | "browse";
type Preferences = { cliPath?: string };

function browseQuery(selection: string): TaskListQuery {
  if (selection.startsWith("list:"))
    return { status: "all", listId: selection.slice(5) };
  switch (selection) {
    case "today":
      return { status: "open", due: "today" };
    case "overdue":
      return { status: "open", due: "overdue" };
    case "important":
      return { status: "open", importance: "high" };
    case "completed":
      return { status: "completed" };
    default:
      return { status: "open" };
  }
}

function listTitle(list: TodoList, lists: TodoList[]): string {
  const name = list.folder
    ? `${list.folder} / ${list.displayName}`
    : list.displayName;
  const duplicate = lists.some(
    (other) =>
      other.id !== list.id &&
      other.folder === list.folder &&
      other.displayName === list.displayName,
  );
  return duplicate ? `${name} · ${list.id.slice(0, 8)}` : name;
}

export function TaskList({ mode }: { mode: Mode }) {
  const { cliPath } = getPreferenceValues<Preferences>();
  const [selection, setSelection] = useState("open");
  const [searchStatus, setSearchStatus] = useState("open");
  const [lists, setLists] = useState<TodoList[]>([]);
  const [listsSync, setListsSync] = useState<string>();
  const [listError, setListError] = useState<string>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionError, setSuggestionError] = useState<string>();
  const [result, setResult] = useState<{
    key: string;
    collection: Collection;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const completing = useRef(new Set<string>());
  const key = mode === "browse" ? selection : mode;
  const visibleResult = result?.key === key ? result.collection : undefined;

  useEffect(() => {
    if (mode !== "browse") return;
    let cancelled = false;
    void listTaskLists(cliPath)
      .then((value) => {
        if (!cancelled) {
          setLists(value.items);
          setListsSync(value.sync.state);
          setListError(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLists([]);
          setListError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, cliPath, revision]);

  useEffect(() => {
    if (mode !== "my-day") return;
    let cancelled = false;
    setSuggestions([]);
    void myDaySuggestions(cliPath)
      .then((value) => {
        if (!cancelled) {
          setSuggestions(value.sync.state === "initial" ? [] : value.items);
          setSuggestionError(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setSuggestionError(
            cause instanceof Error ? cause.message : String(cause),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [mode, cliPath, revision]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load =
      mode === "my-day"
        ? myDay(cliPath)
        : listTasks(
            mode === "search" ? { status: "all" } : browseQuery(selection),
            cliPath,
          );
    void load
      .then((value) => {
        if (!cancelled) {
          setResult({ key, collection: value });
          setError(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult(undefined);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selection, cliPath, revision, key]);

  function refresh() {
    setResult(undefined);
    setRevision((value) => value + 1);
  }

  async function changeStatus(id: string, status: string, title: string) {
    if (completing.current.has(id)) return;
    completing.current.add(id);
    try {
      if (status === "completed") await reopenTask(id, cliPath);
      else await completeTask(id, cliPath);
      await showToast({
        style: Toast.Style.Success,
        title:
          status === "completed"
            ? "Task reopened locally"
            : "Task completed locally",
        message: "Sync may still be pending",
      });
      refresh();
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not change ${title}`,
        message: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      completing.current.delete(id);
    }
  }

  async function addSuggested(task: Suggestion) {
    if (completing.current.has(task.id)) return;
    completing.current.add(task.id);
    try {
      await addToMyDay(task.id, cliPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to My Day locally",
        message: "Sync may still be pending",
      });
      setSuggestions((current) =>
        current.filter((item) => item.id !== task.id),
      );
      refresh();
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add to My Day",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      completing.current.delete(task.id);
    }
  }

  const selectedList = selection.startsWith("list:")
    ? lists.find((list) => list.id === selection.slice(5))
    : undefined;
  const items =
    visibleResult?.items.filter(
      (task) =>
        mode !== "search" ||
        searchStatus === "all" ||
        (searchStatus === "completed"
          ? task.status === "completed"
          : task.status !== "completed"),
    ) ?? [];
  const emptyTitle =
    error ??
    (visibleResult?.sync.state === "initial"
      ? "Initial sync is still running"
      : "No tasks in this view");
  const emptyDescription = error
    ? "Check the CLI Path preference, sign-in, and `ms-todo doctor`."
    : visibleResult?.sync.state === "initial"
      ? "Refresh after ms-todo finishes its first sync."
      : suggestionError && mode === "my-day"
        ? `Could not load suggestions: ${suggestionError}`
        : undefined;

  const dropdown =
    mode === "search" ? (
      <List.Dropdown
        tooltip="Task status"
        value={searchStatus}
        onChange={setSearchStatus}
      >
        <List.Dropdown.Item title="Open" value="open" />
        <List.Dropdown.Item title="Completed" value="completed" />
        <List.Dropdown.Item title="All" value="all" />
      </List.Dropdown>
    ) : mode === "browse" ? (
      <List.Dropdown
        tooltip="Task view"
        value={selection}
        onChange={(value) => {
          setSelection(value);
          setError(undefined);
        }}
      >
        <List.Dropdown.Section title="Smart Views">
          <List.Dropdown.Item title="Open" value="open" />
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Overdue" value="overdue" />
          <List.Dropdown.Item title="Important" value="important" />
          <List.Dropdown.Item title="Completed" value="completed" />
        </List.Dropdown.Section>
        <List.Dropdown.Section
          title={
            listError
              ? `Lists unavailable: ${listError}`
              : listsSync === "initial"
                ? "Lists (initial sync)"
                : "Lists"
          }
        >
          {lists.map((list) => (
            <List.Dropdown.Item
              key={list.id}
              title={listTitle(list, lists)}
              value={`list:${list.id}`}
            />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    ) : undefined;

  return (
    <List
      filtering={true}
      isLoading={loading || (!visibleResult && !error)}
      searchBarPlaceholder="Filter tasks by title, list, or notes"
      searchBarAccessory={dropdown}
    >
      {visibleResult?.sync.state !== "initial" &&
        items.map((task) => {
          const listName = task.list ?? selectedList?.displayName;
          return (
            <List.Item
              key={task.id}
              title={task.title}
              subtitle={listName}
              keywords={[listName ?? "", plainNotes(task)]}
              icon={
                task.status === "completed" ? Icon.CheckCircle : Icon.Circle
              }
              accessories={[
                ...(task.dueDateTime
                  ? [{ text: graphDate(task.dueDateTime, true) }]
                  : []),
                ...(task.sync_state && task.sync_state !== "synced"
                  ? [{ tag: task.sync_state }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Task Details"
                    icon={Icon.Sidebar}
                    target={
                      <TaskDetail
                        id={task.id}
                        listName={listName}
                        onChanged={refresh}
                      />
                    }
                  />
                  <Action
                    title={
                      task.status === "completed"
                        ? "Reopen Task"
                        : "Complete Task"
                    }
                    icon={
                      task.status === "completed"
                        ? Icon.ArrowCounterClockwise
                        : Icon.CheckCircle
                    }
                    onAction={() =>
                      void changeStatus(task.id, task.status, task.title)
                    }
                  />
                  <Action.Push
                    title={
                      selectedList
                        ? `Add Task to ${selectedList.displayName}`
                        : "Quick Add Task"
                    }
                    icon={Icon.Plus}
                    target={
                      <QuickAdd
                        listId={selectedList?.id}
                        listName={selectedList?.displayName}
                        onAdded={refresh}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {mode === "my-day" &&
        visibleResult &&
        visibleResult.sync.state !== "initial" &&
        suggestions.length > 0 && (
          <List.Section title="Suggestions for My Day">
            {suggestions.map((task) => (
              <List.Item
                key={`suggestion:${task.id}`}
                title={task.title}
                subtitle={task.list}
                keywords={[task.list ?? "", plainNotes(task)]}
                icon={Icon.LightBulb}
                accessories={[{ tag: task.suggestion.replaceAll("_", " ") }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Add to My Day"
                      icon={Icon.PlusCircle}
                      onAction={() => void addSuggested(task)}
                    />
                    <Action.Push
                      title="Show Task Details"
                      icon={Icon.Sidebar}
                      target={
                        <TaskDetail
                          id={task.id}
                          listName={task.list}
                          onChanged={refresh}
                        />
                      }
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={refresh}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      {!loading &&
        (visibleResult?.sync.state === "initial" || items.length === 0) &&
        (mode !== "my-day" || suggestions.length === 0) && (
          <List.EmptyView
            title={emptyTitle}
            description={emptyDescription}
            actions={
              <ActionPanel>
                <Action.Push
                  title={
                    selectedList
                      ? `Add Task to ${selectedList.displayName}`
                      : "Quick Add Task"
                  }
                  icon={Icon.Plus}
                  target={
                    <QuickAdd
                      listId={selectedList?.id}
                      listName={selectedList?.displayName}
                      onAdded={refresh}
                    />
                  }
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        )}
    </List>
  );
}

import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { complete, deleteRepeating, list, remove, reopen } from "./lib/jovida";
import { ensureSignedIn } from "./lib/auth";
import {
  BUCKET_TITLE,
  formatReminders,
  formatWhen,
  priorityIcon,
  subtaskProgress,
  timeBucket,
  TimeBucket,
} from "./lib/format";
import { JovidaError, Todo } from "./lib/types";
import { TodoForm } from "./components/todo-form";

type StatusFilter = "pending" | "all";

const BUCKET_ORDER: TimeBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "future",
  "anytime",
];

export default function MyTodosCommand(
  props: LaunchProps<{ launchContext?: { editTodo?: Todo } }>,
) {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  // Cached: shows the last result instantly on open, then revalidates in the
  // background. Auth is detected from the request error, not an upfront check.
  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (st: StatusFilter, query: string) => {
      if (query.trim()) {
        return list({
          query: query.trim(),
          status: st,
          limit: 100,
          full: true,
        });
      }
      return list({ scope: "all", status: st, limit: 100, full: true });
    },
    [status, searchText],
    {
      keepPreviousData: true,
      // Not-signed-in is an expected first-run state (handled by the sign-in
      // view), so don't flash a red error toast for it — only for real errors.
      onError: (e) => {
        if (e instanceof JovidaError && e.code === "NOT_SIGNED_IN") return;
        showFailureToast(e, { title: "Couldn't load todos" });
      },
    },
  );

  const todos = data?.todos ?? [];
  const needsSignIn =
    error instanceof JovidaError && error.code === "NOT_SIGNED_IN";

  // Deep-link from the menu bar's ⌥ Edit: open the edit form for that todo.
  useEffect(() => {
    const editTodo = props.launchContext?.editTodo;
    if (editTodo) {
      push(<TodoForm todo={editTodo} onSaved={revalidate} />);
    }
  }, [props.launchContext?.editTodo, push, revalidate]);

  // Group todos into time buckets, sorted by due time within each.
  const groups = new Map<TimeBucket, Todo[]>();
  for (const todo of todos) {
    const bucket = timeBucket(todo.when);
    const arr = groups.get(bucket);
    if (arr) arr.push(todo);
    else groups.set(bucket, [todo]);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
  }

  async function signInNow() {
    const ok = await ensureSignedIn();
    if (ok) revalidate();
  }

  async function withAction(fn: () => Promise<unknown>, success: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Working…",
    });
    try {
      await fn();
      toast.style = Toast.Style.Success;
      toast.title = success;
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  // Complete with an inline Undo (reopen) on the success toast.
  async function completeWithUndo(todo: Todo) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Completing…",
    });
    try {
      await complete([todo.entry_id]);
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Completed";
      toast.message = todo.title;
      toast.primaryAction = {
        title: "Undo",
        shortcut: { modifiers: ["cmd"], key: "z" },
        onAction: async (t) => {
          await reopen([todo.entry_id]);
          revalidate();
          t.style = Toast.Style.Success;
          t.title = "Reopened";
          t.primaryAction = undefined;
        },
      };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  function renderItem(todo: Todo) {
    const isDone = todo.status === "completed";
    const accessories: List.Item.Accessory[] = [];
    const progress = subtaskProgress(todo);
    if (progress) accessories.push({ tag: progress, icon: Icon.BulletPoints });
    if (todo.recurring_id) accessories.push({ icon: Icon.Repeat });
    const reminders = formatReminders(todo.remind_at);
    if (reminders)
      accessories.push({
        icon: { source: Icon.Alarm, tintColor: Color.Yellow },
        tooltip: `Reminder: ${reminders}`,
      });
    const due = formatWhen(todo.when);
    if (due)
      accessories.push({
        tag: { value: due, color: Color.SecondaryText },
        icon: Icon.Calendar,
      });

    return (
      <List.Item
        key={todo.entry_id}
        icon={
          isDone
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : (priorityIcon(todo.priority) ?? { source: Icon.Circle })
        }
        title={todo.title}
        subtitle={todo.category}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {isDone ? (
                <Action
                  title="Reopen"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() =>
                    withAction(() => reopen([todo.entry_id]), "Reopened")
                  }
                />
              ) : (
                <Action
                  title="Complete"
                  icon={Icon.CheckCircle}
                  onAction={() => completeWithUndo(todo)}
                />
              )}
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<TodoForm todo={todo} onSaved={revalidate} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Add Todo"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<TodoForm onSaved={revalidate} />}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              <Action.CopyToClipboard
                title="Copy Entry ID"
                content={todo.entry_id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {todo.recurring_id ? (
                <Action
                  title="Delete Repeating Series…"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete the entire repeating todo?",
                      message: `"${todo.title}" repeats. Deleting stops ALL future occurrences (not just this one). This cannot be undone. To remove only today's, use Complete instead.`,
                      primaryAction: {
                        title: "Delete Series",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (confirmed) {
                      await withAction(
                        () => deleteRepeating(todo.entry_id, todo.recurring_id),
                        "Series deleted",
                      );
                    }
                  }}
                />
              ) : (
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete this todo?",
                      message: `"${todo.title}" will be permanently deleted. This cannot be undone.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (confirmed) {
                      await withAction(
                        () => remove([todo.entry_id]),
                        "Deleted",
                      );
                    }
                  }}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search todos…"
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        >
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="All (incl. done)" value="all" />
        </List.Dropdown>
      }
    >
      {needsSignIn ? (
        <List.EmptyView
          icon={Icon.Person}
          title="Sign in to Jovida"
          description="Press Enter to sign in (a browser approval page opens)."
          actions={
            <ActionPanel>
              <Action
                title="Sign in to Jovida"
                icon={Icon.Person}
                onAction={signInNow}
              />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load todos"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ) : isLoading && todos.length === 0 ? null : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={searchText ? "No matching todos" : "All clear 🎉"}
          description={
            searchText
              ? "Try a different search."
              : "Add one with ⌘N, or switch to All to see completed."
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Todo"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<TodoForm onSaved={revalidate} />}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      )}
      {!needsSignIn &&
        !error &&
        BUCKET_ORDER.map((bucket) => {
          const items = groups.get(bucket);
          if (!items || items.length === 0) return null;
          return (
            <List.Section
              key={bucket}
              title={BUCKET_TITLE[bucket]}
              subtitle={String(items.length)}
            >
              {items.map(renderItem)}
            </List.Section>
          );
        })}
    </List>
  );
}

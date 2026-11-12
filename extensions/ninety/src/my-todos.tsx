import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { addTodoComment, deleteTodo, getMyTodos, getTeamTodos, updateTodo } from "./api/ninety";
import { Todo } from "./api/types";
import { CommentForm } from "./components/CommentForm";
import { ErrorView } from "./components/ErrorView";
import { MY_ITEMS, TeamDropdown } from "./components/TeamDropdown";
import { TodoForm } from "./components/TodoForm";
import { useTeams } from "./hooks/useTeams";
import { useUsers } from "./hooks/useUsers";
import { showError } from "./lib/errors";
import {
  compact,
  DUE_BUCKETS,
  dueBucket,
  dueDateAccessory,
  formatDate,
  htmlToMarkdown,
  parseDueDate,
  toNinetyDate,
} from "./lib/format";
import { NinetyUrls } from "./lib/urls";
import { useAvatar } from "./hooks/useAvatar";
import { UPDATE_SHORTCUT } from "./lib/shortcuts";

function sortByDueDate(a: Todo, b: Todo) {
  const da = parseDueDate(a.dueDate)?.getTime() ?? Infinity;
  const db = parseDueDate(b.dueDate)?.getTime() ?? Infinity;
  return da - db || a.title.localeCompare(b.title);
}

function todoMarkdown(todo: Todo, userName: (id?: string) => string | undefined) {
  const lines = [`## ${todo.title}`];
  const description = htmlToMarkdown(todo.description);
  if (description) lines.push(description);
  if (todo.comments?.length) {
    lines.push("---", "### Comments");
    for (const comment of todo.comments) {
      const author = userName(comment.userId) ?? "Someone";
      const when = comment.createdDate ? ` · ${formatDate(comment.createdDate)}` : "";
      lines.push(`**${author}**${when}\n\n${comment.text ?? ""}`);
    }
  }
  return lines.join("\n\n");
}

export default function Command() {
  const { avatar, ownerAccessory } = useAvatar();
  const { teams, teamName, error: teamsError, revalidate: retryTeams } = useTeams();
  const { userName } = useUsers();
  const [scope, setScope] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const isMine = scope === MY_ITEMS;

  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    (scope: string, completed: boolean) =>
      scope === MY_ITEMS ? getMyTodos({ completed }) : getTeamTodos(scope, { completed }),
    [scope, showCompleted],
    {
      execute: !!scope,
      keepPreviousData: true,
      onError: (error) => {
        showError(error, "Couldn't load To-Dos");
      },
    },
  );
  const todos = [...(data ?? [])].sort(sortByDueDate);

  async function toggleComplete(todo: Todo) {
    const completed = !todo.completed;
    try {
      await mutate(updateTodo(todo.id, { completed }), {
        optimisticUpdate: (current) => current?.filter((t) => t.id !== todo.id),
      });
      await showToast({ style: Toast.Style.Success, title: completed ? "To-Do completed" : "To-Do reopened" });
    } catch (error) {
      await showError(error, "Couldn't update To-Do");
    }
  }

  async function setDueDate(todo: Todo, date: Date | null) {
    try {
      const dueDate = date ? toNinetyDate(date) : undefined;
      await mutate(updateTodo(todo.id, { dueDate }), {
        optimisticUpdate: (current) => current?.map((t) => (t.id === todo.id ? { ...t, dueDate } : t)),
      });
      await showToast({ style: Toast.Style.Success, title: "Due date updated" });
    } catch (error) {
      await showError(error, "Couldn't update due date");
    }
  }

  async function remove(todo: Todo) {
    const confirmed = await confirmAlert({
      title: "Delete To-Do?",
      message: todo.title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await mutate(deleteTodo(todo.id), { optimisticUpdate: (current) => current?.filter((t) => t.id !== todo.id) });
      await showToast({ style: Toast.Style.Success, title: "To-Do deleted" });
    } catch (error) {
      await showError(error, "Couldn't delete To-Do");
    }
  }

  const createAction = (
    <Action.Push
      title="Create To-Do"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<TodoForm defaultTeamId={isMine ? undefined : scope} onSaved={() => revalidate()} />}
    />
  );

  const completedToggle = (
    <Action
      title={showCompleted ? "Show Open To-Dos" : "Show Completed To-Dos"}
      icon={showCompleted ? Icon.Circle : Icon.CheckCircle}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "h" },
        Windows: { modifiers: ["ctrl", "shift"], key: "h" },
      }}
      onAction={() => setShowCompleted((v) => !v)}
    />
  );

  const sections = showCompleted
    ? [{ title: "Completed", items: todos }]
    : DUE_BUCKETS.map((bucket) => ({ title: bucket, items: todos.filter((t) => dueBucket(t.dueDate) === bucket) }));

  return (
    <List
      isLoading={isLoading || (!scope && !teamsError)}
      isShowingDetail={showDetail && todos.length > 0}
      searchBarPlaceholder="Filter To-Dos"
      searchBarAccessory={<TeamDropdown id="todos-scope" teams={teams} onChange={setScope} mineTitle="My To-Dos" />}
    >
      {teamsError || error ? (
        <ErrorView
          title={teamsError ? "Couldn't load Teams" : "Couldn't load To-Dos"}
          error={(teamsError ?? error)!}
          onRetry={() => (teamsError ? retryTeams() : revalidate())}
        />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={showCompleted ? "No completed To-Dos" : "No open To-Dos"}
          description="Press ⌘N to create one."
          actions={
            <ActionPanel>
              {createAction}
              {completedToggle}
            </ActionPanel>
          }
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.items.length)}>
          {section.items.map((todo) => {
            const owner = isMine ? undefined : userName(todo.userId);
            const team = todo.isPersonal ? "Personal" : (todo.teamName ?? teamName(todo.teamId));
            return (
              <List.Item
                key={todo.id}
                title={todo.title}
                subtitle={showDetail || !isMine ? undefined : team}
                icon={
                  todo.completed
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: dueBucket(todo.dueDate) === "Overdue" ? Color.Red : undefined }
                }
                keywords={[team ?? "", owner ?? ""].filter(Boolean)}
                accessories={
                  showDetail
                    ? undefined
                    : compact<List.Item.Accessory>([
                        todo.comments?.length ? { icon: Icon.Bubble, text: String(todo.comments.length) } : undefined,
                        dueDateAccessory(todo.dueDate, todo.completed),
                        ownerAccessory(owner, todo.userId),
                      ])
                }
                detail={
                  <List.Item.Detail
                    markdown={todoMarkdown(todo, userName)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Team" text={team ?? "—"} />
                        <List.Item.Detail.Metadata.Label
                          title="Owner"
                          text={userName(todo.userId) ?? "—"}
                          icon={avatar(userName(todo.userId), todo.userId)}
                        />
                        <List.Item.Detail.Metadata.Label title="Due" text={formatDate(todo.dueDate) || "—"} />
                        <List.Item.Detail.Metadata.Label title="Created" text={formatDate(todo.createdDate)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                      <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.todo(todo)} />
                      <Action
                        title={todo.completed ? "Reopen To-Do" : "Complete To-Do"}
                        icon={todo.completed ? Icon.Circle : Icon.CheckCircle}
                        shortcut={UPDATE_SHORTCUT}
                        onAction={() => toggleComplete(todo)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Edit To-Do"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={<TodoForm todo={todo} onSaved={() => revalidate()} />}
                      />
                      <Action.PickDate
                        title="Set Due Date"
                        type={Action.PickDate.Type.Date}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "d" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                        }}
                        onChange={(date) => setDueDate(todo, date)}
                      />
                      <Action.Push
                        title="Add Comment"
                        icon={Icon.Bubble}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "opt"], key: "m" },
                          Windows: { modifiers: ["ctrl", "alt"], key: "m" },
                        }}
                        target={
                          <CommentForm
                            itemTitle={todo.title}
                            onSubmit={(text) => addTodoComment(todo.id, text)}
                            onSaved={() => revalidate()}
                          />
                        }
                      />
                      {createAction}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Title"
                        content={todo.title}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      {completedToggle}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={() => revalidate()}
                      />
                      <Action
                        title="Delete To-Do"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => remove(todo)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

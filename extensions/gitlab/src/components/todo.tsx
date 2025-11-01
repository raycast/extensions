import { ActionPanel, Color, Image, launchCommand, LaunchType, List } from "@raycast/api";
import { Project, Todo, User } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { CloseAllTodoAction, CloseTodoAction, ShowTodoDetailsAction } from "./todo_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { useTodos } from "./todo/utils";
import { MyProjectsDropdown } from "./project";
import { useState } from "react";
import { capitalizeFirstLetter, getErrorMessage, showErrorToast } from "../utils";
import { CacheActionPanelSection } from "./cache_actions";

function userToIcon(user?: User): Image.ImageLike {
  let result = "";
  if (!user) {
    return "";
  }
  if (user.avatar_url) {
    result = user.avatar_url;
  }
  return { source: result, mask: Image.Mask.Circle };
}

const actionColors: Record<string, Color> = {
  marked: Color.Green,
  assigned: Color.Purple,
  directly_addressed: Color.Red,
  mentioned: Color.Green,
};

function getActionColor(actionName: string): Color {
  if (!actionName) {
    return Color.Green;
  }
  let result = actionColors[actionName];
  if (!result) {
    result = Color.Green;
  }
  return result;
}

const targetTypeSouce: Record<string, string> = {
  mergerequest: GitLabIcons.merge_request,
  issue: GitLabIcons.issue,
  epic: GitLabIcons.epic,
};

function getTargetTypeSource(tt: string): string {
  if (!tt) {
    return GitLabIcons.todo;
  }
  let result = targetTypeSouce[tt.toLowerCase()];
  if (!result) {
    result = GitLabIcons.todo;
  }
  return result;
}

export function getTodoIcon(todo: Todo, overrideTintColor?: Color.ColorLike | null): Image.ImageLike {
  const tt = todo.target_type;
  return {
    source: getTargetTypeSource(tt),
    tintColor: overrideTintColor ? overrideTintColor : getActionColor(todo.action_name),
  };
}

function TodoListEmptyView(props: { searchMode: boolean }) {
  if (props.searchMode) {
    return <List.EmptyView title="No Todos" icon={{ source: GitLabIcons.todo, tintColor: Color.PrimaryText }} />;
  }
  return (
    <List.EmptyView
      icon="✨"
      title="Isn't an empty Todo list beautiful?"
      description="Are you looking for things to do? Take a look at open issues or contribute to a Merge Request."
    />
  );
}

export function TodoList() {
  const [project, setProject] = useState<Project>();
  const { todos, error, isLoading, performRefetch: refresh } = useTodos(undefined, project);

  if (error) {
    showErrorToast(error, "Cannot search Merge Requests");
  }

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  const refreshAll = async () => {
    refresh();
    try {
      await launchCommand({ name: "todomenubar", type: LaunchType.UserInitiated });
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not open Todos Menu Command");
    }
  };

  return (
    <List
      searchBarPlaceholder="Filter Todos by Name..."
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    >
      <List.Section title="Todos" subtitle={`${todos?.length}`}>
        {todos?.map((todo) => (
          <TodoListItem key={todo.id} todo={todo} refreshData={refreshAll} />
        ))}
      </List.Section>
      <TodoListEmptyView searchMode={todos && todos.length > 0} />
    </List>
  );
}

export function getPrettyTodoActionName(todo: Todo): string {
  return capitalizeFirstLetter(todo.action_name.replaceAll("_", " "));
}

export function TodoListItem(props: { todo: Todo; refreshData: () => void }) {
  const todo = props.todo;
  const subtitle = todo.group ? todo.group.full_path : todo.project_with_namespace || "";
  const updatedAt = todo.updated_at ? new Date(todo.updated_at) : undefined;
  return (
    <List.Item
      id={todo.id.toString()}
      title={todo.title ? todo.title : "?"}
      subtitle={subtitle}
      accessories={[
        { tag: getPrettyTodoActionName(todo), tooltip: `Reason: ${getPrettyTodoActionName(todo)}` },
        { date: updatedAt, tooltip: updatedAt ? `Updated: ${updatedAt.toLocaleString()}` : undefined },
        { icon: userToIcon(todo.author), tooltip: todo.author?.name },
      ]}
      icon={{ value: getTodoIcon(todo), tooltip: todo.target_type }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowTodoDetailsAction todo={todo} />
            <GitLabOpenInBrowserAction url={todo.target_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CloseTodoAction todo={todo} finished={props.refreshData} />
            <CloseAllTodoAction finished={props.refreshData} />
          </ActionPanel.Section>
          <CacheActionPanelSection />
        </ActionPanel>
      }
    />
  );
}

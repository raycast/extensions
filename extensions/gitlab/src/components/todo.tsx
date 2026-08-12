import { ActionPanel, Color, Image, launchCommand, LaunchType, List } from "@raycast/api";
import { Project, Todo } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { CloseAllTodoAction, CloseTodoAction, ShowTodoDetailsAction } from "./todo_actions";
import { MRState } from "./mr";
import { GitLabOpenInBrowserAction } from "./actions";
import { useTodos } from "./todo/utils";
import { MyProjectsDropdown } from "./project";
import { useState } from "react";
import { capitalizeFirstLetter, formatDateTime, isWindows } from "../utils";
import { showFailureToast } from "@raycast/utils";

const actionColors: Record<string, Color> = {
  marked: Color.Green,
  assigned: Color.Purple,
  directly_addressed: Color.Red,
  mentioned: Color.Green,
};

const targetTypeSouce: Record<string, string> = {
  mergerequest: GitLabIcons.merge_request,
  issue: GitLabIcons.issue,
  epic: GitLabIcons.epic,
};

export function getTodoIcon(todo: Todo, overrideTintColor?: Color.ColorLike | null): Image.ImageLike {
  if (todo.target_type === "MergeRequest" && todo.target?.state === MRState.merged) {
    return { source: GitLabIcons.merged, tintColor: overrideTintColor ?? Color.Purple };
  }
  return {
    source: todo.target_type ? targetTypeSouce[todo.target_type.toLowerCase()] || GitLabIcons.todo : GitLabIcons.todo,
    tintColor: overrideTintColor ?? (todo.action_name ? actionColors[todo.action_name] || Color.Green : Color.Green),
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
  const { todos, isLoading, performRefetch: refresh } = useTodos(undefined, project);

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  const refreshAll = async () => {
    refresh();
    try {
      if (!isWindows) {
        await launchCommand({ name: "todomenubar", type: LaunchType.UserInitiated });
      }
    } catch (error) {
      showFailureToast(error, { title: "Could not open Todos Menu Command" });
    }
  };

  return (
    <List
      searchBarPlaceholder="Filter Todos by Name..."
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    >
      <List.Section title="Todos" subtitle={`${todos.length}`}>
        {todos.map((todo) => (
          <TodoListItem key={todo.id} todo={todo} refreshData={refreshAll} />
        ))}
      </List.Section>
      <TodoListEmptyView searchMode={todos.length > 0} />
    </List>
  );
}

export function getPrettyTodoActionName(todo: Todo): string {
  return capitalizeFirstLetter(todo.action_name.replaceAll("_", " "));
}

export function TodoListItem(props: { todo: Todo; refreshData: () => void }) {
  return (
    <List.Item
      id={props.todo.id.toString()}
      title={props.todo.title ? props.todo.title : "?"}
      subtitle={props.todo.group ? props.todo.group.full_path : props.todo.project_with_namespace || ""}
      accessories={[
        {
          tag: getPrettyTodoActionName(props.todo),
          tooltip: `Reason: ${getPrettyTodoActionName(props.todo)}`,
        },
        {
          date: props.todo.updated_at ? new Date(props.todo.updated_at) : undefined,
          tooltip: props.todo.updated_at ? `Updated: ${formatDateTime(props.todo.updated_at)}` : undefined,
        },
        {
          icon: props.todo.author?.avatar_url ? { source: props.todo.author.avatar_url, mask: Image.Mask.Circle } : "",
          tooltip: props.todo.author?.name,
        },
      ]}
      icon={{ value: getTodoIcon(props.todo), tooltip: props.todo.target_type }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowTodoDetailsAction todo={props.todo} />
            <GitLabOpenInBrowserAction url={props.todo.target_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CloseTodoAction todo={props.todo} finished={props.refreshData} />
            <CloseAllTodoAction finished={props.refreshData} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

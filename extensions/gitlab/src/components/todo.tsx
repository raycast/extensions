import { ActionPanel, Color, Image, List } from "@raycast/api";
import { Project, Todo, User } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { CloseAllTodoAction, CloseTodoAction, ShowTodoDetailsAction } from "./todo_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { useTodos } from "./todo/utils";
import { MyProjectsDropdown } from "./project";
import { useState } from "react";
import { ensureCleanAccessories, showErrorToast } from "../utils";

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

function getIcon(todo: Todo): Image.ImageLike {
  const tt = todo.target_type;
  return { source: getTargetTypeSource(tt), tintColor: getActionColor(todo.action_name) };
}

export function TodoList(): JSX.Element {
  const [project, setProject] = useState<Project>();
  const { todos, error, isLoading, performRefetch: refresh } = useTodos(undefined, project);

  if (error) {
    showErrorToast(error, "Cannot search Merge Requests");
  }

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Todos by name..."
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    >
      {todos?.map((todo) => (
        <TodoListItem key={todo.id} todo={todo} refreshData={refresh} />
      ))}
    </List>
  );
}

export function TodoListItem(props: { todo: Todo; refreshData: () => void }): JSX.Element {
  const todo = props.todo;
  const subtitle = todo.group ? todo.group.full_path : todo.project_with_namespace || "";
  return (
    <List.Item
      id={todo.id.toString()}
      title={todo.title}
      subtitle={subtitle}
      accessories={ensureCleanAccessories([{ text: todo.action_name }, { icon: userToIcon(todo.author) }])}
      icon={getIcon(todo)}
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
        </ActionPanel>
      }
    />
  );
}

import {
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { gitlab } from "./common";
import { getTodoIcon, getPrettyTodoActionName } from "./components/todo";
import { useTodos } from "./components/todo/utils";

function launchTodosCommand() {
  launchCommand({ name: "todos", type: LaunchType.UserInitiated });
}

function getMaxTodosPreference(): number {
  const prefs = getPreferenceValues();
  const maxtext = (prefs.maxtodos as string) || "";
  const max = Number(maxtext);
  if (isNaN(max)) {
    return 10;
  }
  if (max < 1) {
    return 10;
  }
  if (max > 100) {
    return 10;
  }
  return max;
}

function getAlwaysVisiblePreference(): boolean {
  const prefs = getPreferenceValues();
  const result = prefs.alwaysshow as boolean;
  return result;
}

function getShowTodoCountPreference(): boolean {
  const prefs = getPreferenceValues();
  const result = prefs.showtext as boolean;
  return result;
}

function TodosMenuBarExtra(props: {
  children: React.ReactNode;
  icon?: Image.ImageLike;
  isLoading?: boolean;
  title?: string;
  tooltip?: string;
  error?: string | undefined;
}): JSX.Element {
  const error = props.error;
  return (
    <MenuBarExtra icon={props.icon} isLoading={props.isLoading} title={props.title} tooltip={props.tooltip}>
      {error ? <MenuBarExtra.Item title={`Error: ${error}`} /> : props.children}
    </MenuBarExtra>
  );
}

function menuBarIcon(): Image.ImageLike {
  const prefs = getPreferenceValues();
  const useGrayscale = prefs.grayicon as boolean;
  if (useGrayscale === true) {
    return { source: "gitlab-dark.svg" };
  }
  return { source: "gitlab.svg" };
}

export default function TodosMenuBarCommand(): JSX.Element | null {
  const { todos: allTodos, error, isLoading } = useTodos();

  if (!allTodos && !isLoading) {
    if (!getAlwaysVisiblePreference()) {
      return null;
    }
  }

  const todos = allTodos?.slice(0, getMaxTodosPreference());
  const unshownTodos =
    todos && allTodos && allTodos.length > 0 && todos.length < allTodos.length ? allTodos.length - todos.length : 0;
  return (
    <TodosMenuBarExtra
      icon={menuBarIcon()}
      isLoading={isLoading}
      error={error}
      title={allTodos && allTodos.length > 0 && getShowTodoCountPreference() ? `${allTodos.length}` : undefined}
      tooltip="GitLab Todos"
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Todos"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={launchTodosCommand}
        />
        <MenuBarExtra.Item
          title="Open Todos in Browser"
          icon={"gitlab.svg"}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={() => open(gitlab.joinUrl("dashboard/todos"))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {todos?.map((t) => (
          <MenuBarExtra.Item
            key={t.id}
            title={t.title}
            subtitle={getPrettyTodoActionName(t)}
            icon={getTodoIcon(t, "#000000")}
            tooltip={t.project_with_namespace}
            onAction={() => (t.target_url ? open(t.target_url) : launchTodosCommand())}
          />
        ))}
        {unshownTodos > 0 && <MenuBarExtra.Item title={`... ${unshownTodos} more`} onAction={launchTodosCommand} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </TodosMenuBarExtra>
  );
}

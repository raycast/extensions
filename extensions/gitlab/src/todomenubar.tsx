import { Icon, launchCommand, LaunchType, MenuBarExtra, open, Color } from "@raycast/api";
import { gitlab } from "./common";
import { getTodoIcon, getPrettyTodoActionName } from "./components/todo";
import { useTodos } from "./components/todo/utils";
import { MenuBarItem, MenuBarItemConfigureCommand, MenuBarRoot, MenuBarSection } from "./components/menu";
import { getBoundedPreferenceNumber, getPreferences } from "./utils";
import { showFailureToast } from "@raycast/utils";

async function launchTodosCommand() {
  try {
    await launchCommand({ name: "todos", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Todos Command" });
  }
}

export default function TodosMenuBarCommand(): React.ReactNode | null {
  const { todos, error, isLoading } = useTodos();
  const { grayicon, alwaysshow, showtext, maxtodos } = getPreferences();

  if (!todos.length && !isLoading && !alwaysshow) {
    return null;
  }

  return (
    <MenuBarRoot
      icon={{ source: "gitlab.svg", ...(grayicon && { tintColor: Color.PrimaryText }) }}
      isLoading={isLoading}
      error={error}
      title={todos && todos.length > 0 && showtext ? `${todos.length}` : undefined}
      tooltip="GitLab Todos"
    >
      <MenuBarSection>
        <MenuBarItem
          title="Open Todos"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={launchTodosCommand}
        />
        <MenuBarItem
          title="Open Todos in Browser"
          icon={"gitlab.svg"}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={() => open(gitlab.joinUrl("dashboard/todos"))}
        />
      </MenuBarSection>
      <MenuBarSection
        maxChildren={getBoundedPreferenceNumber(maxtodos)}
        moreElement={(hidden) => <MenuBarExtra.Item title={`... ${hidden} more`} onAction={launchTodosCommand} />}
      >
        {todos.map((todo) => (
          <MenuBarItem
            key={todo.id}
            title={todo.title ? todo.title : "?"}
            subtitle={getPrettyTodoActionName(todo)}
            icon={getTodoIcon(todo, { light: "#000000", dark: "FFFFFF", adjustContrast: false })}
            tooltip={todo.project_with_namespace}
            onAction={() => (todo.target_url ? open(todo.target_url) : launchTodosCommand())}
          />
        ))}
      </MenuBarSection>
      <MenuBarSection>
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

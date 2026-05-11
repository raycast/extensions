import { Icon, launchCommand, LaunchType, MenuBarExtra, open, getPreferenceValues, Color } from "@raycast/api";
import { gitlab } from "./common";
import { getTodoIcon, getPrettyTodoActionName } from "./components/todo";
import { useTodos } from "./components/todo/utils";
import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/menu";
import { showErrorToast, getErrorMessage } from "./utils";

async function launchTodosCommand() {
  try {
    await launchCommand({ name: "todos", type: LaunchType.UserInitiated });
  } catch (error) {
    await showErrorToast(getErrorMessage(error), "Could not open Todos Command");
  }
}

function getMaxTodosPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxtodos" });
}

export default function TodosMenuBarCommand(): React.ReactNode | null {
  const { todos, error, isLoading } = useTodos();
  const { grayicon, alwaysshow, showtext } = getPreferenceValues<Preferences.Todomenubar>();

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
        maxChildren={getMaxTodosPreference()}
        moreElement={(hidden) => <MenuBarExtra.Item title={`... ${hidden} more`} onAction={launchTodosCommand} />}
      >
        {todos?.map((t) => (
          <MenuBarItem
            key={t.id}
            title={t.title ? t.title : "?"}
            subtitle={getPrettyTodoActionName(t)}
            icon={getTodoIcon(t, { light: "#000000", dark: "FFFFFF", adjustContrast: false })}
            tooltip={t.project_with_namespace}
            onAction={() => (t.target_url ? open(t.target_url) : launchTodosCommand())}
          />
        ))}
      </MenuBarSection>
      <MenuBarSection>
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

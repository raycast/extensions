import { Icon, Image, launchCommand, LaunchType, MenuBarExtra, open, getPreferenceValues, Color } from "@raycast/api";
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

function launchTodosCommand() {
  try {
    launchCommand({ name: "todos", type: LaunchType.UserInitiated });
  } catch (error) {
    showErrorToast(getErrorMessage(error), "Could not open Todos Command");
  }
}

function getMaxTodosPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxtodos" });
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

function menuBarIcon(): Image.ImageLike {
  const prefs = getPreferenceValues();
  const useGrayscale = prefs.grayicon as boolean;
  if (useGrayscale === true) {
    return { source: "gitlab.svg", tintColor: Color.PrimaryText };
  }
  return { source: "gitlab.svg" };
}

export default function TodosMenuBarCommand(): JSX.Element | null {
  const { todos, error, isLoading } = useTodos();

  if (!todos && !isLoading) {
    if (!getAlwaysVisiblePreference()) {
      return null;
    }
  }
  return (
    <MenuBarRoot
      icon={menuBarIcon()}
      isLoading={isLoading}
      error={error}
      title={todos && todos.length > 0 && getShowTodoCountPreference() ? `${todos.length}` : undefined}
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

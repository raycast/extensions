import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { Project } from "../projects/types";
import { Task } from "../tasks/types";
import { Activity } from "../activities/types";

// Windows that the menu bar opens in the "Menu Bar Tools" command.
// To add a new menu bar window: add a view here and render it in src/menu_bar_tools.tsx. No new command needed.
export type MenuBarToolsContext =
  | { view: "task-actions"; task: Task; isFavorite: boolean }
  | { view: "project-actions"; project: Pick<Project, "id" | "name"> }
  | { view: "activity-actions"; activity: Activity }
  | { view: "favorites" }
  | { view: "settings" };

// launchCommand throws when the target command is disabled.
export const launchFromMenuBar = async (options: Parameters<typeof launchCommand>[0], title: string) => {
  try {
    await launchCommand(options);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: `Could not open ${title}`, message: String(error) });
  }
};

export const openMenuBarTool = (context: MenuBarToolsContext) =>
  launchFromMenuBar({ name: "menu_bar_tools", type: LaunchType.UserInitiated, context }, "Menu Bar Tools");

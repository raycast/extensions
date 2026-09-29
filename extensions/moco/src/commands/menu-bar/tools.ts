import { launchCommand, LaunchType } from "@raycast/api";
import { Project } from "../projects/types";
import { Task } from "../tasks/types";

// Windows that the menu bar opens in the "Menu Bar Tools" command.
// To add a new menu bar window: add a view here and render it in src/menu_bar_tools.tsx. No new command needed.
export type MenuBarToolsContext =
  | { view: "task-actions"; task: Task; isFavorite: boolean }
  | { view: "project-actions"; project: Pick<Project, "id" | "name"> }
  | { view: "favorites" }
  | { view: "settings" };

export const openMenuBarTool = (context: MenuBarToolsContext) =>
  launchCommand({ name: "menu_bar_tools", type: LaunchType.UserInitiated, context });

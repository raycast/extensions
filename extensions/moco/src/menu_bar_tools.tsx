import { environment, List } from "@raycast/api";
import { MenuBarToolsContext } from "./commands/menu-bar/tools";
import { TaskActions } from "./commands/menu-bar/TaskActions";
import { ProjectActions } from "./commands/menu-bar/ProjectActions";
import { MenuBarSettings } from "./commands/menu-bar/MenuBarSettings";
import { FavoriteList } from "./commands/favorites/FavoriteList";

// One command for the windows the menu bar opens (see MenuBarToolsContext).
// It only has content with a context from the menu bar. From Raycast search it shows a hint.
export default function Command() {
  const context = environment.launchContext as MenuBarToolsContext | undefined;
  switch (context?.view) {
    case "task-actions":
      return <TaskActions task={context.task} isFavorite={context.isFavorite} />;
    case "project-actions":
      return <ProjectActions project={context.project} />;
    case "favorites":
      return <FavoriteList />;
    case "settings":
      return <MenuBarSettings />;
    default:
      return (
        <List>
          <List.EmptyView
            title="Opened from the menu bar"
            description="Open it from the MOCO menu bar: right-click a task, click a project's ⚙ row, or use Manage Favorites… / Menu Bar Settings…"
          />
        </List>
      );
  }
}

import { Icon, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { XcodeProjectsMenuBarItem } from "./xcode-projects-menu-bar-item.component";
import { XcodeProjectMenuBarService } from "../../services/xcode-project-menu-bar.service";

/**
 * Xcode Projects Menu Bar
 */
export function XcodeProjectsMenuBar() {
  const menuBarList = usePromise(XcodeProjectMenuBarService.list);
  return (
    <MenuBarExtra
      isLoading={menuBarList.isLoading}
      icon={{ source: { light: "xcode-menu-bar-icon-black.png", dark: "xcode-menu-bar-icon-white.png" } }}
      tooltip="Show Recent Xcode Projects"
    >
      {menuBarList.data?.favoriteXcodeProjects.length ? <MenuBarExtra.Item icon={Icon.Star} title="Favorites" /> : null}
      {menuBarList.data?.favoriteXcodeProjects.length ? <MenuBarExtra.Separator /> : null}
      {menuBarList.data?.favoriteXcodeProjects.map((xcodeProject) => (
        <XcodeProjectsMenuBarItem key={xcodeProject.filePath} project={xcodeProject} />
      ))}
      <MenuBarExtra.Item
        icon={Icon.Clock}
        title={
          menuBarList.isLoading
            ? "Loading..."
            : menuBarList.data?.recentXcodeProjects.length
            ? "Recents"
            : "No Recent Xcode Projects"
        }
      />
      {menuBarList.data?.recentXcodeProjects.length ? <MenuBarExtra.Separator /> : null}
      {menuBarList.data?.recentXcodeProjects.map((xcodeProject) => (
        <XcodeProjectsMenuBarItem key={xcodeProject.filePath} project={xcodeProject} />
      ))}
    </MenuBarExtra>
  );
}

import { MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { XcodeProjectsMenuBarItem } from "./xcode-projects-menu-bar-item.component";
import { XcodeProjectMenuBarService } from "../../services/xcode-project-menu-bar.service";

/**
 * Xcode Projects Menu Bar
 */
export function XcodeProjectsMenuBar(): JSX.Element {
  const xcodeProjects = usePromise(XcodeProjectMenuBarService.xcodeProjects);
  return (
    <MenuBarExtra
      isLoading={xcodeProjects.isLoading}
      icon="xcode-menu-bar-icon.png"
      tooltip="Show Recent Xcode Projects"
    >
      <MenuBarExtra.Item
        title={
          xcodeProjects.isLoading
            ? "Loading..."
            : xcodeProjects.data?.length
            ? "Recent Xcode Projects"
            : "No Recent Xcode Projects"
        }
      />
      {xcodeProjects.data?.length ? <MenuBarExtra.Separator /> : null}
      {xcodeProjects.data?.map((xcodeProject) => {
        return <XcodeProjectsMenuBarItem key={xcodeProject.filePath} project={xcodeProject} />;
      })}
    </MenuBarExtra>
  );
}

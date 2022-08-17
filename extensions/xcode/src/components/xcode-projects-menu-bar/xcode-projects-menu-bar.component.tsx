import { MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { XcodeProjectsMenuBarItem } from "./xcode-projects-menu-bar-item.component";
import { XcodeProjectMenuBarService } from "../../services/xcode-project-menu-bar.service";

/**
 * Xcode Projects Menu Bar
 */
export function XcodeProjectsMenuBar(): JSX.Element {
  const { isLoading, data } = usePromise(XcodeProjectMenuBarService.xcodeProjects);
  return (
    <MenuBarExtra isLoading={isLoading} icon="xcode-menu-bar-icon.png" tooltip="Show Recent Xcode Projects">
      <MenuBarExtra.Item
        title={isLoading ? "Loading..." : data?.length ? "Recent Xcode Projects" : "No Recent Xcode Projects"}
      />
      {data?.length ? <MenuBarExtra.Separator /> : null}
      {data?.map((xcodeProject) => {
        return <XcodeProjectsMenuBarItem key={xcodeProject.filePath} project={xcodeProject} />;
      })}
    </MenuBarExtra>
  );
}

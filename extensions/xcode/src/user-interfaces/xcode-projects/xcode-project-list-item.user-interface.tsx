import { XcodeProject } from "../../models/project/xcode-project.model";
import { ActionPanel, List, OpenAction, ShowInFinderAction } from "@raycast/api";
import { XcodeProjectType } from "../../models/project/xcode-project-type.model";
import tildify from "tildify";

/**
 * Xcode Project List Item
 * @param xcodeProject The XcodeProject
 */
export function xcodeProjectListItem(
  xcodeProject: XcodeProject
): JSX.Element {
  return (
    <List.Item
      key={xcodeProject.filePath}
      title={xcodeProject.name}
      subtitle={tildify(xcodeProject.filePath)}
      accessoryTitle={accessoryTitle(xcodeProject.type)}
      keywords={xcodeProject.keywords}
      icon={{ source: imageAssetSource(xcodeProject.type) }}
      actions={
        <ActionPanel>
          <OpenAction
            title="Open with Xcode"
            target={xcodeProject.filePath} />
          <ShowInFinderAction path={xcodeProject.filePath} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Retrieve image asset source from XcodeProjectType
 * @param xcodeProjectType The XcodeProjectType
 */
function imageAssetSource(
  xcodeProjectType: XcodeProjectType
): string {
  switch (xcodeProjectType) {
    case XcodeProjectType.project:
      return "xcode-project.png";
    case XcodeProjectType.workspace:
      return "xcode-workspace.png";
    case XcodeProjectType.swiftPackage:
      return "swift-package.png";
    case XcodeProjectType.swiftPlayground:
      return "swift-playground.png";
  }
}

/**
 * Retrieve accessory title from XcodeProjectType
 * @param xcodeProjectType The XcodeProjectType
 */
function accessoryTitle(
  xcodeProjectType: XcodeProjectType
): string {
  switch (xcodeProjectType) {
    case XcodeProjectType.project:
      return "Project";
    case XcodeProjectType.workspace:
      return "Workspace";
    case XcodeProjectType.swiftPackage:
      return "Swift Package";
    case XcodeProjectType.swiftPlayground:
      return "Playground";
  }
}

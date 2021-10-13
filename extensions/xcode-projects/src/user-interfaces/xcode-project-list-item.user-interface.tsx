import { XcodeProject } from "../models/xcode-project.model";
import { ActionPanel, List, OpenAction, ShowInFinderAction } from "@raycast/api";
import { XcodeProjectType } from "../models/xcode-project-type.model";

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
      subtitle={xcodeProject.filePath}
      keywords={xcodeProject.keywords}
      icon={{ source: imageAssetSource(xcodeProject.type) }}
      actions={
        <ActionPanel>
          <OpenAction
            title="Open in Xcode"
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
      return "swift-package.png"
  }
}

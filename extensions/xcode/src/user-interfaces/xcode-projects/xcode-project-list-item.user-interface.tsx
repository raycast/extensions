import { XcodeProject } from "../../models/project/xcode-project.model";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { XcodeProjectType } from "../../models/project/xcode-project-type.model";
import tildify from "tildify";
import { ReactNode } from "react";

/**
 * Xcode Project List Item
 * @param xcodeProject The XcodeProject
 * @param customActionsProvider TThe optional custom XcodeProject actions provider. Default value `null`
 */
export function xcodeProjectListItem(
  xcodeProject: XcodeProject,
  customActionsProvider: ((xcodeProject: XcodeProject) => ReactNode) | null = null
): JSX.Element {
  return (
    <List.Item
      key={xcodeProject.filePath}
      title={xcodeProject.name}
      subtitle={tildify(xcodeProject.filePath)}
      accessories={[{ text: accessoryTitle(xcodeProject.type) }]}
      keywords={xcodeProject.keywords}
      icon={{ source: imageAssetSource(xcodeProject.type) }}
      actions={
        <ActionPanel>
          {customActionsProvider ? customActionsProvider(xcodeProject) : defaultActions(xcodeProject)}
        </ActionPanel>
      }
    />
  );
}

/**
 * Default Actions for a given XcodeProject
 * @param xcodeProject The XcodeProject
 */
function defaultActions(xcodeProject: XcodeProject): ReactNode {
  return [
    <Action.Open
      application="com.apple.dt.Xcode"
      key="open-with-xcode"
      title="Open with Xcode"
      target={xcodeProject.filePath}
      icon={Icon.Hammer}
    />,
    <Action.ShowInFinder key="show-in-finder" path={xcodeProject.filePath} />,
  ];
}

/**
 * Retrieve image asset source from XcodeProjectType
 * @param xcodeProjectType The XcodeProjectType
 */
function imageAssetSource(xcodeProjectType: XcodeProjectType): string {
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
function accessoryTitle(xcodeProjectType: XcodeProjectType): string {
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

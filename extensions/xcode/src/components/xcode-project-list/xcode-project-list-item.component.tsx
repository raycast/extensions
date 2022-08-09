import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import tildify from "tildify";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Project List Item
 */
export function XcodeProjectListItem(props: { project: XcodeProject; actions?: JSX.Element }): JSX.Element {
  const navigation = useNavigation();
  return (
    <List.Item
      key={props.project.filePath}
      title={props.project.name}
      subtitle={tildify(props.project.filePath)}
      accessories={[{ text: accessoryTitle(props.project.type) }]}
      keywords={props.project.keywords}
      icon={{ source: imageAssetSource(props.project.type) }}
      actions={
        props.actions ?? (
          <ActionPanel>
            <Action.Open
              application={XcodeService.bundleIdentifier}
              key="open-with-xcode"
              title="Open with Xcode"
              target={props.project.filePath}
              icon={Icon.Hammer}
              onOpen={navigation.pop}
            />
            <Action.ShowInFinder key="show-in-finder" path={props.project.filePath} />
          </ActionPanel>
        )
      }
    />
  );
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

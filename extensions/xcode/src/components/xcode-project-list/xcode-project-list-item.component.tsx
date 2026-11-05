import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import tildify from "tildify";
import * as Path from "path";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { StableTagColor } from "../../shared/stable-tag-color";
import { XcodeService } from "../../services/xcode.service";
import { JSX } from "react";
import { searchRecentProjectsCommandPreferences } from "../../shared/preferences";

/**
 * Returns the accessories showing the git root directory of the Xcode Project,
 * or its parent directory if it is not in a git repository
 * @param project The Xcode Project
 */
function XcodeProjectDirectoryAccessories(project: XcodeProject): List.Item.Accessory[] {
  // A Swift Package is named after its directory, so use the directory containing it
  const parentDirectoryPath =
    project.type === XcodeProjectType.swiftPackage ? Path.dirname(project.directoryPath) : project.directoryPath;
  const directoryName = Path.basename(project.gitRootDirectoryPath ?? parentDirectoryPath);
  const tooltip = tildify(project.filePath);
  return [
    { tag: { value: directoryName, color: StableTagColor(directoryName) }, tooltip: tooltip },
    {
      icon: { source: project.gitRootDirectoryPath ? "git-branch.svg" : Icon.Folder, tintColor: Color.SecondaryText },
      tooltip: tooltip,
    },
  ];
}

/**
 * Xcode Project List Item
 */
export function XcodeProjectListItem(props: {
  project: XcodeProject;
  isFavorite: boolean;
  actions?: [JSX.Element];
  onToggleFavoriteAction: () => void;
}) {
  const navigation = useNavigation();
  const terminalApp = searchRecentProjectsCommandPreferences.terminalApp;
  const showDirectoryTag = searchRecentProjectsCommandPreferences.showDirectoryTag;
  return (
    <List.Item
      title={props.project.name}
      subtitle={showDirectoryTag ? undefined : tildify(props.project.directoryPath)}
      accessories={[
        ...(showDirectoryTag ? XcodeProjectDirectoryAccessories(props.project) : []),
        { text: XcodeProjectTypeName(props.project.type) },
      ]}
      keywords={props.project.keywords}
      icon={XcodeProjectIcon(props.project.type)}
      actions={
        <ActionPanel>
          {props.actions ? props.actions : undefined}
          {!props.actions ? (
            <Action.Open
              application={XcodeService.bundleIdentifier}
              title="Open with Xcode"
              target={props.project.filePath}
              icon={Icon.Hammer}
              onOpen={navigation.pop}
            />
          ) : undefined}
          {!props.actions ? <Action.ShowInFinder path={props.project.filePath} /> : undefined}
          {!props.actions && terminalApp ? (
            <Action
              title={`Open With ${terminalApp.name}`}
              icon={{ fileIcon: terminalApp.path }}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onAction={() =>
                open(props.project.directoryPath, terminalApp).catch(() =>
                  showToast(Toast.Style.Failure, `Failed to open with ${terminalApp.name}`)
                )
              }
            />
          ) : undefined}
          <Action
            title={props.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={props.isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={props.onToggleFavoriteAction}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action.CreateQuicklink
            quicklink={{
              link: props.project.filePath,
              name: props.project.name,
              application: XcodeService.bundleIdentifier,
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
}

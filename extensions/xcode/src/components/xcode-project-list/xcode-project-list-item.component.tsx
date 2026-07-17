import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, Icon, Keyboard, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { XcodeService } from "../../services/xcode.service";
import { JSX } from "react";
import { searchRecentProjectsCommandPreferences } from "../../shared/preferences";

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
  return (
    <List.Item
      title={props.project.name}
      subtitle={tildify(props.project.filePath)}
      accessories={[{ text: XcodeProjectTypeName(props.project.type) }]}
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

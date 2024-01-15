import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { XcodeService } from "../../services/xcode.service";
import { JSX } from "react";

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
          <Action
            title={props.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={props.isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={props.onToggleFavoriteAction}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
        </ActionPanel>
      }
    />
  );
}

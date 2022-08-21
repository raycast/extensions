import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Project List Item
 */
export function XcodeProjectListItem(props: {
  project: XcodeProject;
  isFavorite: boolean;
  actions?: [JSX.Element];
  onToggleFavoriteAction: () => void;
}): JSX.Element {
  const navigation = useNavigation();
  return (
    <List.Item
      key={props.project.filePath}
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
              key="open-with-xcode"
              title="Open with Xcode"
              target={props.project.filePath}
              icon={Icon.Hammer}
              onOpen={navigation.pop}
            />
          ) : undefined}
          {!props.actions ? <Action.ShowInFinder key="show-in-finder" path={props.project.filePath} /> : undefined}
          <Action
            key="favorite"
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

import { AbletonLiveProject } from "../models/ableton-live-project.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { AbletonLiveService } from "../services/ableton-live.service";
import tildify from "tildify";

export function AbletonLiveProjectListItem(props: {
  project: AbletonLiveProject;
  isFavorite: boolean;
  actions?: [JSX.Element];
  onToggleFavoriteAction: () => void;
}): JSX.Element {
  const navigation = useNavigation();
  return (
    <List.Item
      title={props.project.name}
      subtitle={tildify(props.project.filePath)}
      accessories={[
        {
          tag: props.project.modifiedDate,
          tooltip: `Last modified: ${props.project.modifiedDate.toLocaleString()}`,
        },
      ]}
      icon="ableton-live-project-icon.png"
      actions={
        <ActionPanel>
          {props.actions ? props.actions : undefined}
          {!props.actions ? (
            <Action.Open
              application={AbletonLiveService.bundleIdentifier}
              title="Open with Ableton Live"
              target={props.project.filePath}
              icon="ableton-live-icon.png"
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

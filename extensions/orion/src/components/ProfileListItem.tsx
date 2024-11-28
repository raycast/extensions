import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Profile } from "../types";
import { idToColor } from "../utils";

const Actions = (props: { profile: Profile }) => (
  <ActionPanel>
    <ActionPanel.Section>
      {props.profile.appPath && <Action.Open title="Open App" target={props.profile.appPath} />}
      {props.profile.appPath && <Action.ShowInFinder title="Show Profile in Finder" path={props.profile.appPath} />}
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title="Copy Profile Name"
        content={props.profile.name}
        shortcut={{ key: "c", modifiers: ["cmd"] }}
      />
      <Action.CopyToClipboard
        title="Copy Profile ID"
        content={props.profile.id}
        shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
      />
      {props.profile.appPath && (
        <Action.CopyToClipboard
          title="Copy Profile Path"
          content={props.profile.appPath}
          shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
        />
      )}
    </ActionPanel.Section>
    <ActionPanel.Section>
      {props.profile.dataPath && (
        <Action.ShowInFinder
          title="Show Profile Data in Finder"
          path={props.profile.dataPath}
          shortcut={{ key: "d", modifiers: ["cmd"] }}
        />
      )}
    </ActionPanel.Section>
  </ActionPanel>
);

const ProfileListItem = (props: { profile: Profile }) => (
  <List.Item
    icon={{ source: Icon.PersonCircle, tintColor: idToColor(props.profile.color) }}
    title={props.profile.name}
    keywords={[props.profile.id]}
    actions={<Actions profile={props.profile} />}
  />
);

export default ProfileListItem;

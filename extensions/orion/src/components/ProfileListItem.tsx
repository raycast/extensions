import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Profile } from "../types";

const Actions = (props: { profile: Profile }) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Open title="Open App" target={props.profile.appPath} />
      <Action.ShowInFinder title="Show Profile in Finder" path={props.profile.appPath} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Profile Name" content={props.profile.name} shortcut={{ key: "c", modifiers: ["cmd"] }} />
      <Action.CopyToClipboard title="Copy Profile ID" content={props.profile.id} shortcut={{ key: "c", modifiers: ["cmd", "shift"] }} />
      <Action.CopyToClipboard title="Copy Profile Path" content={props.profile.appPath} shortcut={{ key: "c", modifiers: ["cmd", "opt"] }} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.ShowInFinder title="Show Profile Data in Finder" path={props.profile.dataPath} shortcut={{ key: "d", modifiers: ["cmd"] }} />
    </ActionPanel.Section>
  </ActionPanel>
);

const idToColor = (id: number) => {
  switch (id) {
    case 0: return "#98989D"
    case 1: return "#CC66FF"
    case 2: return "#F7509E"
    case 3: return "#FF5045"
    case 4: return "#FFA915"
    case 5: return "#FFE018"
    case 6: return "#3EFD56"
    case 7: return "#A2A2A7"
  }
  return Color.PrimaryText;
}

const ProfileListItem = (props: { profile: Profile }) => (
  <List.Item
    icon={{ source: Icon.PersonCircle, tintColor: idToColor(props.profile.color) }}
    title={props.profile.name}
    keywords={[props.profile.id]}
    actions={<Actions profile={props.profile} />}
  />
);

export default ProfileListItem;

import { Action, ActionPanel, Icon } from "@raycast/api";
import { Profile } from "../types";
import { UserValsList } from "../components/UserValsList";

export const UserProfile = ({ profile }: { profile?: Profile }) => {
  if (!profile) return null;
  return (
    <ActionPanel.Section title={profile.username}>
      <Action.OpenInBrowser
        url={`https://www.val.town/u/${profile.username}`}
        title="View Profile on Val Town"
        icon={Icon.PersonCircle}
      />
      <Action.Push title="View Vals" target={<UserValsList userId={profile?.id} />} icon={Icon.List} />
      <Action.CopyToClipboard content={profile.id} title="Copy ID" icon={Icon.Clipboard} />
    </ActionPanel.Section>
  );
};

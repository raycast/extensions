import { List, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { CommunityView } from "lemmy-js-client";
import { getPreferences } from "../interfaces/preferences";
import CommunityTimeline from "../views/CommunityTimeline";

const CommunityItem = ({ community }: { community: CommunityView }) => {
  const { push } = useNavigation();

  const actorIdURL = new URL(community.community.actor_id);

  return (
    <List.Item
      key={community.community.id}
      title={community.community.name}
      icon={community.community.icon || Icon.TwoPeople}
      detail={
        <List.Item.Detail
          markdown={`${community.community.banner ? `![Banner](${community.community.banner})` : ""}\n# ${
            community.community.name
          }\n\n${community.community.description || "No description."}`}
        />
      }
      actions={
        <ActionPanel title="Actions">
          <ActionPanel.Section>
            <Action
              title="View Community"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                push(<CommunityTimeline community={community} />);
              }}
            />
            <Action.OpenInBrowser
              title="Open Lemmy Community"
              url={`${
                actorIdURL.origin === getPreferences().instanceUrl
                  ? community.community.actor_id
                  : `${getPreferences().instanceUrl}/c/${community.community.name}@${actorIdURL.hostname}`
              }`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default CommunityItem;

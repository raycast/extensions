import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { PersonView } from "lemmy-js-client";
import { getPreferences } from "../interfaces/preferences";

const UserItem = ({ user }: { user: PersonView }) => {
  const actorIdURL = new URL(user.person.actor_id);

  return (
    <List.Item
      title={user.person.display_name || user.person.name}
      icon={user.person.avatar || Icon.PersonCircle}
      accessories={[
        {
          text: `${user.person.name}@${actorIdURL.hostname}`,
          icon: Icon.Person,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={`${user.person.avatar ? `![Avatar](${user.person.avatar})` : ""}\n\n${
            user.person.bio || "No bio."
          }`}
        />
      }
      actions={
        <ActionPanel title="Actions">
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Lemmy User"
              url={`${
                actorIdURL.origin === getPreferences().instanceUrl
                  ? user.person.actor_id
                  : `${getPreferences().instanceUrl}/u/${user.person.name}@${actorIdURL.hostname}`
              }`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default UserItem;

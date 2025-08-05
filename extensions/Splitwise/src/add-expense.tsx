import { Action, ActionPanel, Icon, Image, List, Color, Keyboard } from "@raycast/api";
import { getFriends, getGroups } from "./hooks/useFriends_Groups";
import { getCurrency_code } from "./utils/utils";
import { FillForm } from "./components-add/FillForm";

import { Entity } from "./types/friends_groups.types";

export default function Command() {
  const [friends, loadingFriends, revalidateFriends] = getFriends();
  const [groups, loadingGroups, revalidateGroups] = getGroups();
  function cmpUpdatedAt(a: Entity, b: Entity) {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }

  function lastInteractionAccessory(entity: Entity) {
    const date = new Date(entity.updated_at);
    return {
      date,
      tooltip: `Last interaction: ${date.toLocaleString()}`,
    };
  }

  return (
    <List searchBarPlaceholder="Search your favorite friend or group" isLoading={loadingFriends || loadingGroups}>
      <List.Section title="Friends">
        {friends.sort(cmpUpdatedAt).map((friend) => (
          <List.Item
            key={friend.id}
            icon={{ source: friend.picture.small ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={[friend.first_name, friend.last_name].join(" ")}
            accessories={[
              // return the amount and currency code if they are present, if not, don't show anything
              friend.balance.length > 0
                ? {
                    tag: {
                      value: `${Number(friend.balance[0].amount).toFixed(2)} ${
                        getCurrency_code(friend.balance[0].currency_code).symbol
                      }`,
                      color: Number(friend.balance[0].amount) < 0 ? Color.Red : Color.Green,
                    },
                  }
                : {},
              lastInteractionAccessory(friend),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Wallet}
                  title="Add Expense"
                  target={<FillForm friend={friend} revalidateFriends={revalidateFriends} />}
                />
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidateFriends()}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://secure.splitwise.com/#/friends/${friend.id}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Groups">
        {groups.sort(cmpUpdatedAt).map((Group) => (
          <List.Item
            key={Group.id}
            icon={{ source: Group.avatar.small ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={Group.name}
            accessories={[lastInteractionAccessory(Group)]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Wallet}
                  title="Add Expense"
                  target={<FillForm group={Group} revalidateGroups={revalidateGroups} />}
                />
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidateGroups()}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://secure.splitwise.com/#/groups/${Group.id}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

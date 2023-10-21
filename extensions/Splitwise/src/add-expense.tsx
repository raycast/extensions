import { Action, ActionPanel, Icon, Image, List, Form, Color, useNavigation, Keyboard } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { Entity, ExpenseParams, FriendOrGroupProps } from "./types/friends_groups.types";
import { getFriends, getGroups, postExpense } from "./hooks/useFriends_Groups";

import { getCurrency_code } from "./utils/utils";

export default function Command() {
  const [friends, loadingFriends, revalidateFriends] = getFriends();
  const [groups, loadingGroups, revalidateGroups] = getGroups();

  function cmpUpdatedAt(a: Entity, b: Entity) {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }

  function lastInteractionAccessory(entity: Entity) {
    return {
      date: new Date(entity.updated_at),
      tooltip: `Last interaction: ${new Date(entity.updated_at).toLocaleString()}`,
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
                      value: `${Number(friend.balance[0].amount).toFixed(2)} ${getCurrency_code(
                        friend.balance[0].currency_code
                      )}`,
                      color: Number(friend.balance[0].amount) < 0 ? Color.Red : Color.Green,
                    },
                  }
                : {},
              lastInteractionAccessory(friend),
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Wallet} title="Add Expense" target={<FillForm friend={friend} />} />
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
                <Action.Push icon={Icon.Wallet} title="Add Expense" target={<FillForm group={Group} />} />
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

function FillForm(props: FriendOrGroupProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ input: string }>({
    onSubmit: (values) => {
      const paramsJson: ExpenseParams = {
        input: `${values.input}`,
        autosave: true,
      };
      props.friend ? (paramsJson["friend_id"] = props.friend.id) : (paramsJson["group_id"] = props.group.id);
      postExpense(paramsJson).then(() => pop());
    },
    validation: {
      input: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Add Expense"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Expense" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${props.friend ? "Friend" : "Group"}`}
        text={props.friend ? [props.friend.first_name, props.friend.last_name].join(" ") : props.group.name}
      />
      <Form.TextArea
        title="Natural Language Input"
        placeholder={props.friend ? `I owe ${props.friend.first_name} 12.82 for movie tickets` : `I paid 23 for pizza`}
        {...itemProps.input}
        info="Enter a description of the expense in plain English. We'll do the rest!"
      />
    </Form>
  );
}

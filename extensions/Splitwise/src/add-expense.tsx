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

  const { handleSubmit, itemProps } = useForm<{ description: string; cost: string; date: Date | null }>({
    onSubmit: (values) => {
      const paramsJson: ExpenseParams = {
        description: values.description,
        cost: values.cost,
        date: values.date,
        split_equally: true,
      };
      props.friend ? (paramsJson["friend_id"] = props.friend.id) : (paramsJson["group_id"] = props.group.id);
      postExpense(paramsJson).then(() => pop());
    },
    validation: {
      description: FormValidation.Required,
      cost: (input) => {
        // check if input is integer or float with 1 or 2 decimal places
        if (!input?.match(/^\d+(\.\d{1,2})?$/)) {
          return "Decimal value (2 places)";
        }
      },
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
      <Form.TextField title="Description" placeholder="Movie tickets" {...itemProps.description} />
      <Form.TextField
        title="Cost"
        placeholder="0.00"
        {...itemProps.cost}
        info="Expense will be split equally; assumes you are the payer."
      />
      <Form.DatePicker title="Date" {...itemProps.date} />
    </Form>
  );
}

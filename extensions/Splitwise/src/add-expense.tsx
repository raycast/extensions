import { Action, ActionPanel, Icon, Image, List, Form, showToast, Toast, Color, useNavigation } from "@raycast/api";
import { useState } from "react";

import { Entity, ExpenseParams, Friend, Group, Body, FriendOrGroupProps, Expense } from "./types/friends_groups.types";
import { getFriends, getGroups, postExpense } from "./hooks/useFriends_Groups";

export default function Command() {
  const [friends, loadingFriends] = getFriends();
  const [groups, loadingGroups] = getGroups();

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
              {
                text: {
                  value: `${
                    friend.balance[0]?.amount && friend.balance[0]?.currency_code
                      ? `${friend.balance[0].amount} ${friend.balance[0].currency_code}`
                      : ""
                  }`,
                  color: Number(friend.balance[0]?.amount) < 0 ? Color.Red : Color.Green,
                },
              },
              { icon: `${friend.balance[0]?.amount && friend.balance[0]?.currency_code ? Icon.Coins : ""}` },
              lastInteractionAccessory(friend),
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Wallet} title="Add Expense" target={<FillForm friend={friend} />} />
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
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function FillForm(props: FriendOrGroupProps) {
  const [input, setDescription] = useState<string>("");

  return (
    <Form
      navigationTitle="Add Expense"
      actions={
        <ActionPanel>
          <ShareSecretAction input={input} resetDescription={() => setDescription("")} {...props} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${props.friend ? "Friend" : "Group"}`}
        text={props.friend ? [props.friend.first_name, props.friend.last_name].join(" ") : props.group.name}
      />
      <Form.TextArea
        id="input"
        title="Natural Language Input"
        value={input}
        onChange={setDescription}
        placeholder={
          props.friend ? `I owe ${props.friend.first_name} 12.82 for cinema...` : `I paid 23 bucks for pizza...`
        }
      />
    </Form>
  );
}

function ShareSecretAction(props: { input: string; resetDescription: () => void } & FriendOrGroupProps) {
  const { pop } = useNavigation();

  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Add Expense",
    });

    function successToast(expense: Expense) {
      toast.style = Toast.Style.Success;
      toast.title = "Yay!";
      toast.message = `Added "${expense.description}" worth ${expense.cost} ${expense.currency_code}!`;

      props.resetDescription();
    }

    function failureToast(expense: Expense) {
      toast.style = Toast.Style.Failure;
      toast.title = "D'oh! Invalid input!";

      let errorString = "";
      const response_error = expense.errors;
      for (const key in response_error) {
        errorString += key + ": " + response_error[key] + "\n";
      }
      toast.message = `${errorString}`;
    }

    try {
      const paramsJson: ExpenseParams = {
        input: `${props.input}`,
        autosave: true,
      };

      props.friend ? (paramsJson["friend_id"] = props.friend.id) : (paramsJson["group_id"] = props.group.id);

      postExpense(paramsJson).then(({ body }) => {
        if (body.valid == true) {
          successToast(body.expense);
        } else {
          failureToast(body.expense);
        }
      });
    } catch (errors) {
      toast.style = Toast.Style.Failure;
      toast.title = "D'oh!";
      toast.message = String(errors);
    }
  }

  return (
    <Action.SubmitForm
      icon={Icon.Wallet}
      title="Add Expense"
      onSubmit={() => {
        handleSubmit()
        .then(() => pop());
      }}
    />
  );
}

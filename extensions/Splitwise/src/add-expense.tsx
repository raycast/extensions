import { Action, ActionPanel, Icon, Image, List, Form, Color, useNavigation, Keyboard } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { Entity, ExpenseParams, Friend, Group, Body, FriendOrGroupProps, Expense } from "./types/friends_groups.types";
import { getFriends, getGroups, postExpense } from "./hooks/useFriends_Groups";

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
              // {
              //   tag: friend.balance.filter((b) => b).map((b) => ({
              //     value: `${b.amount} ${b.currency_code}`,
              //     color: Number(b.amount) < 0 ? Color.Red : Color.Green,
              //   }))[0] // use the first element of the filtered array as the value of the tag element
              // },
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
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidateFriends()}
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
          <Action.SubmitForm
            title="Add Expense"
            // onSubmit={(values) => {
            //   const paramsJson: ExpenseParams = {
            //     input: `${values.input}`,
            //     autosave: true,
            //   };
            //   props.friend ? (paramsJson["friend_id"] = props.friend.id) : (paramsJson["group_id"] = props.group.id);
            //   postExpense(paramsJson).then(() => pop());
            // }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${props.friend ? "Friend" : "Group"}`}
        text={props.friend ? [props.friend.first_name, props.friend.last_name].join(" ") : props.group.name}
      />
      <Form.TextArea
        // id="input"
        title="Natural Language Input"
        placeholder={props.friend ? `I owe ${props.friend.first_name} 12.82 for movie tickets` : `I paid 23 for pizza`}
        {...itemProps.input}
      />
    </Form>
  );
}

// function AddNewExpense(props: { input: string; resetDescription: () => void } & FriendOrGroupProps) {
//   const { pop } = useNavigation();

//   async function handleSubmit() {
//     const toast = await showToast({
//       style: Toast.Style.Animated,
//       title: "Add Expense",
//     });

//     function successToast(expense: Expense) {
//       toast.style = Toast.Style.Success;
//       toast.title = "Yay!";
//       toast.message = `Added "${expense.description}" worth ${expense.cost} ${expense.currency_code}!`;

//       props.resetDescription();
//     }

//     function failureToast(expense: Expense) {
//       toast.style = Toast.Style.Failure;
//       toast.title = "D'oh! Invalid input!";

//       let errorString = "";
//       const response_error = expense.errors;
//       for (const key in response_error) {
//         errorString += key + ": " + response_error[key] + "\n";
//       }
//       toast.message = `${errorString}`;
//     }

//     try {
//       const paramsJson: ExpenseParams = {
//         input: `${props.input}`,
//         autosave: true,
//       };

//       props.friend ? (paramsJson["friend_id"] = props.friend.id) : (paramsJson["group_id"] = props.group.id);

//       postExpense(paramsJson).then(({ body }) => {
//         if (body.valid == true) {
//           successToast(body.expense);
//         } else {
//           failureToast(body.expense);
//         }
//       });
//     } catch (errors) {
//       toast.style = Toast.Style.Failure;
//       toast.title = "D'oh!";
//       toast.message = String(errors);
//     }
//   }

//   return (
//     <Action.SubmitForm
//       icon={Icon.Wallet}
//       title="Add Expense"
//       onSubmit={() => {
//         handleSubmit()
//         .then(() => pop());
//       }}
//     />
//   );
// }

import { Expense } from "./types/get_expenses.types";

import { GetExpense, DeleteExpense, UpdateExpense } from "./hooks/useList";
import { loadingLimit } from "./hooks/userPreferences";
import { GetCurrentUser } from "./hooks/useCurrentUser";
import { getGroups } from "./hooks/useFriends_Groups";

import { getCurrency_code } from "./utils/utils";

import { Action, ActionPanel, Icon, Image, List, Color, Form, useNavigation, Keyboard } from "@raycast/api";

function getColor(expense: Expense, currentUserID: number) {
  let netBalance = expense.users
    .filter((user) => user.user.id === currentUserID)
    .map((user) => Number(user.net_balance))[0];

  if (netBalance > 0) {
    return Color.Green;
  } else if (netBalance < 0) {
    return Color.Red;
  } else {
    return Color.PrimaryText;
  }
}

function expenseSplitEqually(owes: string[]) {
  const similarThreshold = 0.03;
  const owedShareNumbers = owes.map((owedShare) => Number(owedShare));
  const firstOwedShare = owedShareNumbers[0];
  const isSimilarOwedShares = owedShareNumbers.every(
    (owedShare) => Math.abs(owedShare - firstOwedShare) <= similarThreshold
  );
  return isSimilarOwedShares;
}

export default function Command() {
  const [expenses, loadingExpenses, revalidate, Mutate] = GetExpense(loadingLimit); // FETCH EXPENSES

  const currentUser = GetCurrentUser(); // FETCH CURRENT USER
  const currentUserID = currentUser?.id as number;
  const [groups, loadingGroups] = getGroups();

  const handleDeleteExpense = (expenseID: number) => {
    DeleteExpense(expenseID, Mutate);
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Search Expenses" isLoading={loadingExpenses || loadingGroups}>
      {expenses
        .filter((expense) => expense.deleted_at === null)
        .map((expense) => (
          <List.Item
            key={expense.id}
            keywords={expense.users.map((user) => user.user.first_name)}
            title={expense.description}
            accessories={[
              {
                icon: expense.group_id ? Icon.TwoPeople : "",
                tooltip: `Group: ${
                  expense.group_id ? groups.filter((group) => group.id === expense.group_id)[0].name : ""
                }`,
              },
              { icon: expense.payment ? Icon.BankNote : "", tooltip: "Payment" },
              {
                tag: {
                  value: `${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code)}`,
                  color: getColor(expense, currentUserID),
                  // color: currentUserID ? getColor(expense, currentUserID) : Color.PrimaryText,
                },
                tooltip: `Amount: ${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code)}`,
              },
            ]}
            detail={
              <List.Item.Detail
                isLoading={loadingExpenses}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={expense.description}>
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code)}`}
                        color={getColor(expense, currentUserID)}
                        key={expense.id}
                        icon={Icon.Coins}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {expense.group_id && ( // GROUP EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Group Expense"
                          text={`Open '${groups.filter((group) => group.id === expense.group_id)[0].name}'`}
                          target={`https://secure.splitwise.com/#/groups/${expense.group_id}`}
                        />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label // DATE OF CREATION
                      title={`Created by ${
                        expense.created_by["id"] === currentUserID ? "You" : expense.created_by["first_name"]
                      }`}
                      icon={Icon.Calendar}
                      text={new Date(expense.date).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                      key={expense.created_by["id"]}
                    />
                    {expense.updated_by && (
                      <List.Item.Detail.Metadata.Label // DATE OF LAST UPDATE
                        title={`Last updated by ${
                          expense.updated_by["id"] === currentUserID ? "You" : expense.updated_by["first_name"]
                        }`}
                        icon={Icon.Pencil}
                        text={new Date(expense.date).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title={`Paid by`}>
                      {expense.users
                        .filter((user) => Number(user.paid_share) > 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              Number(user.owed_share) === 0
                                ? `${user.user.first_name} paid ${Number(user.paid_share).toFixed(
                                    2
                                  )} ${getCurrency_code(expense.currency_code)}`
                                : `${user.user.first_name} paid ${Number(user.paid_share).toFixed(
                                    2
                                  )} ${getCurrency_code(expense.currency_code)} and owes ${Number(
                                    user.owed_share
                                  ).toFixed(2)} ${getCurrency_code(expense.currency_code)}`
                            }
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Green}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title={expense.payment === true ? "Received by" : "Owed by"}>
                      {expense.users
                        .filter((user) => Number(user.net_balance) < 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              expense.payment === true
                                ? `${user.user.first_name} received ${(Number(user.net_balance) * -1).toFixed(
                                    2
                                  )} ${getCurrency_code(expense.currency_code)}`
                                : `${user.user.first_name} owes ${(Number(user.net_balance) * -1).toFixed(
                                    2
                                  )} ${getCurrency_code(expense.currency_code)}`
                            }
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Red}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    {expense.repeats === true && ( // REPEATING EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Repeating Expense" text={expense.repeat_interval} />
                      </>
                    )}
                    {expense.receipt.original !== null && ( // RECEIPT
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Receipt"
                          text="View Receipt"
                          target={expense.receipt.original}
                        />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open Expense in Splitwise"
                    url={`https://secure.splitwise.com/#/all/expenses/${expense.id}`}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  {expense.users.filter((user) => Number(user.paid_share) > 0).length <= 1 && expenseSplitEqually(expense.users.map((user) => user.owed_share)) === true && ( // if more than 1 person paid, don't allow to change values
                    <Action.Push
                      title="Change values"
                      icon={Icon.Pencil}
                      target={<ChangeValues expense={expense} />}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                  )}
                  {expense.receipt.original !== null && (
                    <Action.OpenInBrowser title="Open Receipt" url={expense.receipt.original} icon={Icon.Receipt} />
                  )}
                </ActionPanel.Section>
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidate()}
                />
                <Action
                  title="Delete Expense"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => handleDeleteExpense(expense.id)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

// ------------ FORM ------------
// Comment out some lines due to updating costs not working at the moment
import { useForm, FormValidation } from "@raycast/utils";
import { getFriends } from "./hooks/useFriends_Groups";
// import { useState, useEffect } from "react";

function ChangeValues(handedOverValues: { expense: Expense }) {
  const { expense } = handedOverValues;

  // const [splitEqually, setSplitEqually] = useState(false);
  // useEffect(() => {
  //   const similarThreshold = 0.03;
  //   const checkSimilarOwedShares = (owedShares: string[]) => {
  //     const owedShareNumbers = owedShares.map((owedShare) => Number(owedShare));
  //     const firstOwedShare = owedShareNumbers[0];
  //     const isSimilarOwedShares = owedShareNumbers.every(
  //       (owedShare) => Math.abs(owedShare - firstOwedShare) <= similarThreshold
  //     );
  //     if (!isSimilarOwedShares) {
  //       setSplitEqually(true);
  //     }
  //   };
  //   checkSimilarOwedShares(expense.users.map((user) => user.owed_share));
  // }, []);

  const { pop } = useNavigation();
  const [friends] = getFriends();
  const currentUser = GetCurrentUser() as any; // FETCH CURRENT USER
  const friendsWithCurrentUser = [...friends, currentUser];

  const { handleSubmit, itemProps, values, setValue, focus } = useForm<Expense | any>({
    onSubmit: (input) => {
      const numberShares = input.owes?.length;
      const cost = Number(input.cost);

      let share = Math.floor((cost * 100) / numberShares) / 100;
      let adjustedShare = (cost - share) / (numberShares - 1);
      adjustedShare = isNaN(adjustedShare) ? 0 : Math.round(adjustedShare * 100) / 100;

      // drop input.paid from input.owes
      input.owes = input.owes?.filter((user: any) => user !== input.paid);

      const paramsJson: any = {
        cost: input.cost as string,
        description: input.description as string,
        date: input.date,
        group_id: expense.group_id as number,
        users__0__user_id: input.paid as number,
        users__0__paid_share: input.cost,
        users__0__owed_share: share,
      };

      let counter = 1;
      input.owes?.map((user: any) => {
        paramsJson[`users__${counter}__user_id`] = user as number;
        paramsJson[`users__${counter}__owed_share`] = adjustedShare;
        counter++;
      });

      UpdateExpense(expense.id, paramsJson).then(() => pop());
      // console.log(paramsJson); // DEBUG
    },

    initialValues: {
      cost: Number(expense.cost).toFixed(2),
      description: expense.description,
      date: new Date(expense.date),
      paid: expense.users.filter((user) => Number(user.paid_share) > 0)[0].user.id.toString(),
      owes: expense.users.filter((user) => Number(user.owed_share) > 0).map((user) => String(user.user.id)),
      // split: splitEqually,
    },

    validation: {
      description: FormValidation.Required,
      date: FormValidation.Required,
      paid: FormValidation.Required,
      owes: (input) => {
        if (input.length < 2 && expense.payment === false) {
          return "Select at least 2 people";
        }
      },
      cost: (input) => {
        if (!input?.match(/^\d+(\.\d{1,2})?$/)) {
          // check if input is integer or float with 1 or 2 decimal places
          return "Decimal value (2 places)";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={`Change values of '${expense.description}'`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.DatePicker title="Date of Expense" {...itemProps.date} />
      <Form.TextField title={`Cost in ${getCurrency_code(expense.currency_code)}`} {...itemProps.cost} />
      <Form.Separator />
      {/* <Form.Checkbox
        label="Split expense equally"
        value={splitEqually}
        onChange={() => setSplitEqually(!splitEqually)}
        id="split"
      /> */}
      <Form.Dropdown title="Who paid?" {...itemProps.paid} >
        {friendsWithCurrentUser.map((friend) => (
          <Form.Dropdown.Item
            key={friend.id}
            value={String(friend.id)}
            title={[friend.first_name, friend.last_name].join(" ")}
            icon={{ source: friend.picture.small, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        title="Who owes?"
        {...itemProps.owes}
        info="Expense will be split equally among the involved people"
      >
        {friendsWithCurrentUser.map((friend) => (
          <Form.TagPicker.Item
            key={friend.id}
            value={String(friend.id)}
            title={[friend.first_name, friend.last_name].join(" ")}
            icon={{ source: friend.picture.small, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.TagPicker>

      {/* {splitEqually === false &&
        friendsWithCurrentUser
        .filter((friend) => values.owes.includes(String(friend.id)))
        .map((friend) => (
          <Form.TextField
            id={String(friend.id)}
            key={friend.id}
            title={friend.first_name}
            defaultValue={expense.users.filter((user) => user.user.id === friend.id)[0].owed_share.toString()}
          />
        ))} */}

    </Form>
  );
}

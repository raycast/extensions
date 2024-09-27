import { Action, ActionPanel, Icon, Image, List, Color, Keyboard, Detail } from "@raycast/api";

import { Expense } from "./types/get_expenses.types";
import { GetExpense, DeleteExpense } from "./hooks/useList";
import { loadingLimit } from "./hooks/userPreferences";
import { GetCurrentUser } from "./hooks/useCurrentUser";
import { getGroups } from "./hooks/useFriends_Groups";

import { getCurrency_code, getColor, expenseSplitEqually } from "./utils/utils";
import { ChangeValues } from "./components-list/ChangeValues";

const ReceiptDetail = ({ expense }: { expense: Expense }) => {
  const markdown = `
  ![Receipt](${expense.receipt.original}?raycast-width=384&raycast-height=410)
  `;

  return <Detail navigationTitle={`Receipt of '${expense.description}'`} markdown={markdown} />;
};

export default function Command() {
  const [expenses, loadingExpenses, revalidate, Mutate] = GetExpense(loadingLimit); // FETCH EXPENSES

  const currentUser = GetCurrentUser(); // FETCH CURRENT USER
  const currentUserID = currentUser?.id as number;
  const [groups, loadingGroups] = getGroups();

  const filteredExpenses = expenses.filter(expense => !expense.deleted_at);

  const handleDeleteExpense = (expenseID: number) => {
    DeleteExpense(expenseID, Mutate);
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Search Expenses" isLoading={loadingExpenses || loadingGroups}>
      {filteredExpenses
        .map((expense) => (
          <List.Item
            key={expense.id}
            keywords={expense.users.map((user) => user.user.first_name)}
            title={expense.description}
            accessories={[
              {
                icon: expense.group_id ? Icon.TwoPeople : "",
                tooltip: `Group: ${
                  expense.group_id ? groups.filter((group) => group.id === expense.group_id)[0]?.name : ""
                }`,
              },
              { icon: expense.payment ? Icon.BankNote : "", tooltip: "Payment" },
              {
                tag: {
                  value: `${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code).symbol}`,
                  color: getColor(expense, currentUserID),
                },
                tooltip: `Amount: ${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code).symbol}`,
              },
            ]}
            detail={
              <List.Item.Detail
                isLoading={loadingExpenses}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={expense.description}>
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${Number(expense.cost).toFixed(2)} ${getCurrency_code(expense.currency_code).symbol}`}
                        color={getColor(expense, currentUserID)}
                        key={expense.id}
                        icon={Icon.Coins}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {expense.group_id ? ( // GROUP EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Group Expense"
                          text={`Open '${groups.filter((group) => group.id === expense.group_id)[0]?.name}'`}
                          target={`https://secure.splitwise.com/#/groups/${expense.group_id}`}
                        />
                      </>
                    ) : null}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label // DATE OF CREATION
                      title="Date"
                      icon={Icon.Calendar}
                      text={new Date(expense.date).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                      key={expense.created_by["id"]}
                    />
                    {expense.updated_by ? (
                      <List.Item.Detail.Metadata.Label // DATE OF LAST UPDATE
                        title={`Last updated by ${
                          expense.updated_by["id"] === currentUserID ? "You" : expense.updated_by["first_name"]
                        }`}
                        icon={Icon.Pencil}
                        text={new Date(expense.updated_at).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      />
                    ) : null}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title={`Paid by`}>
                      {expense.users
                        .filter((user) => Number(user.paid_share) > 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              Number(user.owed_share) === 0
                                ? `${user.user.first_name} paid ${Number(user.paid_share).toFixed(2)} ${
                                    getCurrency_code(expense.currency_code).symbol
                                  }`
                                : `${user.user.first_name} paid ${Number(user.paid_share).toFixed(2)} ${
                                    getCurrency_code(expense.currency_code).symbol
                                  } and owes ${Number(user.owed_share).toFixed(2)} ${
                                    getCurrency_code(expense.currency_code).symbol
                                  }`
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
                                ? `${user.user.first_name} received ${(Number(user.net_balance) * -1).toFixed(2)} ${
                                    getCurrency_code(expense.currency_code).symbol
                                  }`
                                : `${user.user.first_name} owes ${(Number(user.net_balance) * -1).toFixed(2)} ${
                                    getCurrency_code(expense.currency_code).symbol
                                  }`
                            }
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Red}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    {expense.repeats === true ? ( // REPEATING EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Repeating Expense" text={expense.repeat_interval} />
                      </>
                    ) : null}
                    {expense.receipt.original !== null ? ( // RECEIPT
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Receipt"
                          text="View Receipt"
                          target={expense.receipt.original}
                        />
                      </>
                    ) : null}
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
                  {expense.users.filter((user) => Number(user.paid_share) > 0).length <= 1 &&
                  expenseSplitEqually(expense.users.map((user) => user.owed_share)) === true ? (
                    <Action.Push
                      title="Change values"
                      icon={Icon.Pencil}
                      target={<ChangeValues expense={expense} />}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                  ) : null}
                  {expense.receipt.original !== null ? (
                    <Action.Push
                      title="View Receipt"
                      icon={Icon.Receipt}
                      target={<ReceiptDetail expense={expense} />}
                      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                    />
                  ) : null}
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

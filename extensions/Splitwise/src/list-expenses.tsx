import { Action, ActionPanel, Icon, Image, List, Color, Keyboard, Detail } from "@raycast/api";
import { ChangeValues } from "./components-list/ChangeValues";
import { GetExpense, DeleteExpense } from "./hooks/useList";
import { loadingLimit } from "./hooks/userPreferences";
import { GetCurrentUser } from "./hooks/useCurrentUser";
import { getGroups } from "./hooks/useFriends_Groups";
import { getCurrency_code, getColor, expenseSplitEqually } from "./utils/utils";

import { Expense } from "./types/get_expenses.types";

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

  const filteredExpenses = expenses.filter((expense) => !expense.deleted_at);

  const handleDeleteExpense = (expenseID: number) => {
    DeleteExpense(expenseID, Mutate);
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Search Expenses" isLoading={loadingExpenses || loadingGroups}>
      {filteredExpenses.map((expense) => {
        const group = groups.find((g) => g.id === expense.group_id);
        const currency = getCurrency_code(expense.currency_code).symbol;
        const formattedCost = `${Number(expense.cost).toFixed(2)} ${currency}`;

        return (
          <List.Item
            key={expense.id}
            keywords={expense.users.map((user) => user.user.first_name)}
            title={expense.description}
            accessories={[
              {
                icon: expense.group_id ? Icon.TwoPeople : "",
                tooltip: `Group: ${expense.group_id ? group?.name : ""}`,
              },
              { icon: expense.payment ? Icon.BankNote : "", tooltip: "Payment" },
              {
                tag: {
                  value: formattedCost,
                  color: getColor(expense, currentUserID),
                },
                tooltip: `Amount: ${formattedCost}`,
              },
            ]}
            detail={
              <List.Item.Detail
                isLoading={loadingExpenses}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={expense.description}>
                      <List.Item.Detail.Metadata.TagList.Item
                        text={formattedCost}
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
                          text={`Open '${group?.name}'`}
                          target={`https://secure.splitwise.com/#/groups/${expense.group_id}`}
                        />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label // DATE OF EXPENSE
                      title="Date"
                      icon={Icon.Calendar}
                      text={new Date(expense.date).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                      key={expense.created_by.id}
                    />
                    {expense.updated_by && (
                      <List.Item.Detail.Metadata.Label // DATE OF LAST UPDATE
                        title={`Last updated by ${
                          expense.updated_by.id === currentUserID ? "You" : expense.updated_by.first_name
                        }`}
                        icon={Icon.Pencil}
                        text={new Date(expense.updated_at).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Paid by">
                      {expense.users
                        .filter((user) => Number(user.paid_share) > 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              Number(user.owed_share) === 0
                                ? `${user.user.first_name} paid ${Number(user.paid_share).toFixed(2)} ${currency}`
                                : `${user.user.first_name} paid ${Number(user.paid_share).toFixed(
                                    2
                                  )} ${currency} and owes ${Number(user.owed_share).toFixed(2)} ${currency}`
                            }
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Green}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title={expense.payment ? "Received by" : "Owed by"}>
                      {expense.users
                        .filter((user) => Number(user.net_balance) < 0)
                        .map((user) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              expense.payment
                                ? `${user.user.first_name} received ${(Number(user.net_balance) * -1).toFixed(
                                    2
                                  )} ${currency}`
                                : `${user.user.first_name} owes ${(Number(user.net_balance) * -1).toFixed(
                                    2
                                  )} ${currency}`
                            }
                            icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                            color={Color.Red}
                            key={user.user_id}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    {expense.repeats && ( // REPEATING EXPENSES
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Repeating Expense" text={expense.repeat_interval} />
                      </>
                    )}
                    {expense.receipt.original && ( // RECEIPT
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
                  {expense.users.filter((user) => Number(user.paid_share) > 0).length <= 1 &&
                    expenseSplitEqually(expense.users.map((user) => user.owed_share)) && (
                      <Action.Push
                        title="Change values"
                        icon={Icon.Pencil}
                        target={<ChangeValues expense={expense} mutate={Mutate} />}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                    )}
                  {expense.receipt.original && (
                    <Action.Push
                      title="View Receipt"
                      icon={Icon.Receipt}
                      target={<ReceiptDetail expense={expense} />}
                      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                    />
                  )}
                </ActionPanel.Section>
                <Action
                  title="Reload"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
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
        );
      })}
    </List>
  );
}

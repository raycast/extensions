import {personalAccessToken} from "./preferences"; // Personal Access Token
import { GetExpenses, Expense } from "./get_expenses"; 
import { useFetch } from "@raycast/utils";

// TODOS
// - [ ] Add a way to delete expenses -> https://dev.splitwise.com/#tag/expenses/paths/~1delete_expense~1{id}/post
// - [ ] Add a way to update expenses -> https://dev.splitwise.com/#tag/expenses/paths/~1update_expense~1{id}/post
// ------------ API ------------

const OPTIONS = {
  headers: {
    Authorization: `Bearer ${personalAccessToken}`,
    Accept: "application/json",
  },
};

// ------------ FUNCTIONS ------------
// async function get_expenses(): Promise<[GetExpenses, boolean]> {
//     try {
//       const response = await axios.get(`https://secure.splitwise.com/api/v3.0/get_expenses`, OPTIONS);
//       const expenses = response?.data || [];
//       const loadingExpenses = response.isloading;
//       return [expenses, loadingExpenses];
//     } catch (error) {
//       throw new Error(`Error while fetching expenses: \n ${error}`);
//     }
//   }

// function get_expenses(): [Expense[], boolean] {
//   const response = useFetch<GetExpenses>("https://secure.splitwise.com/api/v3.0/get_expenses?limit=50", OPTIONS);
//   const fetchedExpenses = response?.data?.expenses || [];
//   const loadingExpenses = response.isLoading;
//   console.log("Executed get_expenses"); // DEBUG

//   if (response.error) {console.log(`Error while fetching expenses: \n ${response.error}`);}

//   return [fetchedExpenses, loadingExpenses];
// }

function get_expenses(limit: string): [Expense[], boolean, () => void] {
  const { isLoading, data, revalidate, error } = useFetch<GetExpenses>(
    `https://secure.splitwise.com/api/v3.0/get_expenses?limit=${limit}`,
    OPTIONS
  );
  const fetchedExpenses = data?.expenses || [];
  console.log("Executed get_expenses"); // DEBUG

  if (error) {
    console.log(`Error while fetching expenses: \n ${error}`);
  }

  return [fetchedExpenses, isLoading, revalidate];
}

// const get_expenses = () => {
//     const { isLoading, data, revalidate } = useFetch<GetExpenses>("https://secure.splitwise.com/api/v3.0/get_expenses?limit=50", OPTIONS);
//     const fetchedExpenses = data?.expenses || [];
//     return [fetchedExpenses, isLoading, revalidate];
//     };
// ---------------------------------------------------------------

// ------------ MAIN ------------
import { Action, ActionPanel, Icon, Image, List, Form, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [expenses, loadingExpenses, revalidate] = get_expenses("1000");

  return (
    <List isShowingDetail searchBarPlaceholder="Search Expenses" isLoading={loadingExpenses}>
      {expenses.map((expense) => (
        <List.Item
          key={expense.id}
          keywords={expense.users.map((user) => user.user.first_name)}
          title={expense.description}
          accessories={[
            // { tag: new Date(expense.date), tooltip: `Date: ${new Date(expense.date).toLocaleString()}` },
            {
              tag: { value: `${expense.cost} ${expense.currency_code}`, color: Color.SecondaryText },
              tooltip: `Amount: ${expense.cost} ${expense.currency_code}`,
            },
          ]}
          detail={
            <List.Item.Detail
              //   markdown={`#### ${expense.description} \n - ${expense.users.filter((user) => Number(user.paid_share) > 0).length > 0
              //       ? expense.users
              //           .filter((user) => Number(user.paid_share) > 0)
              //           .map((user) => `**${user.user.first_name}** paid ${user.paid_share} ${expense.currency_code}`)
              //           .join("\n - ")
              //       : ""
              //   } \n --- \n Testline`}
              isLoading={loadingExpenses}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Description" />
                  <List.Item.Detail.Metadata.TagList title={expense.description}>
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${expense.currency_code} ${expense.cost} `}
                      color={Color.PrimaryText}
                      key={expense.id}
                      icon={Icon.Coins}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title={`Created by ${expense.created_by["first_name"]}`}
                    text={new Date(expense.created_at).toDateString()}
                    key={expense.created_by["id"]}
                  />
                  {expense.updated_by && (
                    <List.Item.Detail.Metadata.Label
                      title={`Updated by ${expense.updated_by["first_name"]}`}
                      text={new Date(expense.updated_at).toDateString()}
                    />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.TagList title={`Paid by`}>
                    {expense.users
                      .filter((user) => Number(user.paid_share) > 0)
                      .map((user) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${user.user.first_name} paid ${expense.currency_code} ${user.paid_share}`}
                          icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                          color={Color.Green}
                          key={user.user_id}
                        />
                      ))}
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.TagList title={`Pays back`}>
                    {expense.users
                      .filter((user) => Number(user.net_balance) < 0)
                      .map((user) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${user.user.first_name} owes ${expense.currency_code} ${String(
                            Number(user.net_balance) * -1
                          )}`}
                          icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                          color={Color.Red}
                          key={user.user_id}
                        />
                      ))}
                  </List.Item.Detail.Metadata.TagList>

                  {expense.repeats === true && ( // REPEATING EXPENSE
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Repeating Expense" text={expense.repeat_interval} />
                    </>
                  )}

                  {expense.receipt.original !== null && ( // RECEIPT
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link title="Receipt" text="View" target={expense.receipt.original} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Expense in Splitwise"
                url={`https://secure.splitwise.com/#/all/expenses/${expense.id}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action title="Reload" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

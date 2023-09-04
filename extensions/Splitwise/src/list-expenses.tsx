import { Detail, getPreferenceValues } from "@raycast/api";
import { GetExpenses, Expense } from "./get_expenses";
// import axios from "axios";
import { useFetch } from "@raycast/utils";

// ------------ API ------------
const { personalAccessToken } = getPreferenceValues();
if (!personalAccessToken) {
  throw new Error("Personal access token is missing");
}

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

function get_expenses(): [Expense[], boolean, () => void] {
  const { isLoading, data, revalidate, error } = useFetch<GetExpenses>(
    "https://secure.splitwise.com/api/v3.0/get_expenses?limit=200",
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
import exp from "constants";

export default function Command() {
  const [expenses, loadingExpenses, revalidate] = get_expenses();

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
              tag: { value: `${expense.cost} ${expense.currency_code}`, color: Color.Green },
              tooltip: `Cost: ${expense.cost} ${expense.currency_code}`,
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
                  <List.Item.Detail.Metadata.TagList title={expense.description}>
                    <List.Item.Detail.Metadata.TagList.Item
                      text={expense.cost + " " + expense.currency_code}
                      color={Color.PrimaryText}
                      key={expense.id}
                      icon={Icon.Coins}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title={`Created by ${expense.created_by["first_name"]}`}
                    text={new Date(expense.created_at).toLocaleDateString()}
                    key={expense.created_by["id"]}
                  />
                  {expense.updated_by && (
                    <List.Item.Detail.Metadata.Label
                      title={`Updated by ${expense.updated_by["first_name"]}`}
                      text={new Date(expense.updated_at).toLocaleDateString()}
                    />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.TagList title={`Paid by`}>
                    {expense.users
                      .filter((user) => Number(user.paid_share) > 0)
                      .map((user) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${user.user.first_name} paid ${user.paid_share} ${expense.currency_code}`}
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
                          text={`${user.user.first_name} owes ${String(Number(user.net_balance) * -1)} ${
                            expense.currency_code
                          }`}
                          icon={{ source: user.user.picture.medium, mask: Image.Mask.Circle }}
                          color={Color.Red}
                          key={user.user_id}
                        />
                      ))}
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Separator />

                  {/* {expense.users
                    .filter((user) => Number(user.owed_share) > 0)
                    .map((user) => (
                      <List.Item.Detail.Metadata.Label
                        title={`${user.user.first_name} owes ${user.owed_share} ${expense.currency_code}`}
                        text={user.owed_share}
                        key={user.user_id}
                      />
                    ))}

                  <List.Item.Detail.Metadata.Separator /> */}

                  {/* {expense.users
                    .filter((user) => Number(user.paid_share) > 0)
                    .map((user) => (
                      <List.Item.Detail.Metadata.Label
                      title={`${user.user.first_name} owes ${user.owed_share} ${expense.currency_code}`}
                      key={user.user_id}
                      />
                    ))} */}
                  {/* <List.Item.Detail.Metadata.Separator /> */}


                  {/* <List.Item.Detail.Metadata.Label title={expense.description} />
                  <List.Item.Detail.Metadata.Label title="Type" icon={Icon.AddPerson} text="Grass" />
                  <List.Item.Detail.Metadata.Separator /> */}

                  {/* <List.Item.Detail.Metadata.Separator />
                  
                  <List.Item.Detail.Metadata.Label title="Chracteristics" />
                  
                  <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                  
                  <List.Item.Detail.Metadata.Link title="Link" text="Google" target="https://www.google.com" /> */}
                  {/* <List.Item.Detail.Metadata.Label title="Link" text="Google" /> */}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Reload" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

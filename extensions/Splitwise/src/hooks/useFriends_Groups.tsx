import { useFetch } from "@raycast/utils";
import { HEADER } from "./userPreferences";
import { GetFriends, GetGroups, Friend, Group } from "../types/friends_groups.types";
import { ExpenseParams } from "../types/get_expenses.types";
import axios from "axios";
import { showToast, Toast } from "@raycast/api";

export function getFriends(): [Friend[], boolean, any] {
  const { isLoading, data, error, revalidate } = useFetch<GetFriends>(
    "https://secure.splitwise.com/api/v3.0/get_friends",
    {
      method: "GET",
      ...HEADER,
      keepPreviousData: true,
    }
  );

  const friends = data?.friends || [];

  if (error) {
    console.error(`Error while fetching friends: \n ${error}`);
  }

  return [friends, isLoading, revalidate];
}

export function getGroups(): [Group[], boolean, any] {
  const { isLoading, data, error, revalidate } = useFetch<GetGroups>(
    "https://secure.splitwise.com/api/v3.0/get_groups",
    {
      method: "GET",
      ...HEADER,
      keepPreviousData: true,
    }
  );

  const groups = data?.groups.filter((group) => group.id !== 0) || [];

  if (error) {
    console.error(`Error while fetching groups: \n ${error}`);
  }

  return [groups, isLoading, revalidate];
}

export async function postExpense(paramsJson: ExpenseParams) {
  await showToast({ style: Toast.Style.Animated, title: "Adding Expense" });
  try {
    const responseSubmit = await axios({
      method: "post",
      url: `https://secure.splitwise.com/api/v3.0/create_expense`,
      ...HEADER,
      data: paramsJson,
    });

    if (Object.keys(responseSubmit.data.errors).length) {
      showToast({
        style: Toast.Style.Failure,
        title: "D'oh! Invalid input!",
        message: Object.entries(responseSubmit.data.errors).join("\n"),
      });
    } else {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `Added "${responseSubmit.data.expenses[0].description}" worth ${Number(
          responseSubmit.data.expenses[0].cost
        ).toFixed(2)} ${responseSubmit.data.expenses[0].currency_code}!`,
      });
    }
  } catch (error: any) {
    showToast({ style: Toast.Style.Failure, title: "Couldn't add Expense!", message: error.message });
  }
}

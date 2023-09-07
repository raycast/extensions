import { GetExpenses, Expense } from "../get_expenses.js"; // Types
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

import { useFetch } from "@raycast/utils";
import axios from "axios";

export const loadingLimit = getPreferenceValues().loadingLimit;

// ------------ API header------------
import { personalAccessToken } from "../preferences.js"; // Personal Access Token
const OPTIONS = {
  headers: {
    Authorization: `Bearer ${personalAccessToken}`,
    Content: "application/json",
  },
};

// FUNCTIONS
export function GetExpense(limit: string): [Expense[], boolean, any, any] {
  const { isLoading, data, error, revalidate, mutate } = useFetch<GetExpenses>(
    `https://secure.splitwise.com/api/v3.0/get_expenses?limit=${limit}`,
    {
      method: "GET",
      ...OPTIONS,
      keepPreviousData: false,
    }
  );
  const fetchedExpenses = data?.expenses || [];

  if (error) {
    console.log(`Error while fetching expenses: \n ${error}`);
  }
  return [fetchedExpenses, isLoading, revalidate, mutate];
}

export const DeleteExpense = async (id: number, mutate: any) => {
  await showToast({ style: Toast.Style.Animated, title: "Deleting Expense" });
  try {
    const responseDelete = await mutate(
      await axios.get(`https://secure.splitwise.com/api/v3.0/delete_expense/${id}`, OPTIONS),
      {
        optimisticUpdate(expenses: Expense[]) {
          return delete expenses[id];
        },
        revalidate: true,
        rollbackOnError: true,
      }
    );

    if (responseDelete.data.success) {
      showToast({ style: Toast.Style.Success, title: "Expense deleted" });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete!",
        message: responseDelete.data.errors.expense,
      });
    }
  } catch (error: any) {
    showToast({ style: Toast.Style.Failure, title: "Couldn't delete!", message: error.message });
    console.error(error);
  }
};

// FORM FUNCTION

export async function handleSubmit(values: any) {
  await showToast({ style: Toast.Style.Animated, title: "Updating Expense" });
  try {
    const responseSubmit = await axios({
      method: "post",
      url: `https://secure.splitwise.com/api/v3.0/update_expense/${values.id}`,
      ...OPTIONS,
      data: {
        description: values.description,
        // cost: values.cost,
        date: values.date,
        group_id: values.group_id,
      },
    });

    if (Object.keys(responseSubmit.data.errors).length === 0) {
      showToast({ style: Toast.Style.Success, title: `Expense '${values.description}' updated` });
    } else {
      showToast({ style: Toast.Style.Failure, title: "Couldn't update!", message: responseSubmit.data.errors.base });
    }
  } catch (error: any) {
    showToast({ style: Toast.Style.Failure, title: "Couldn't update!", message: error.message });
    console.log(error);
  }
}

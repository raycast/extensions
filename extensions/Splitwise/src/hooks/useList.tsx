import { GetExpenses, Expense } from "../types/get_expenses.types"; // Types
import { showToast, Toast } from "@raycast/api";
import { HEADER } from "./userPreferences";

import { useFetch } from "@raycast/utils";
import axios from "axios";

export function GetExpense(limit: string): [Expense[], boolean, any, any] {
  const { isLoading, data, error, revalidate, mutate } = useFetch<GetExpenses>(
    `https://secure.splitwise.com/api/v3.0/get_expenses?limit=${limit}`,
    {
      method: "GET",
      ...HEADER,
      keepPreviousData: true,
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
      await axios.get(`https://secure.splitwise.com/api/v3.0/delete_expense/${id}`, HEADER),
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
export async function UpdateExpense(expenseID: number, values: any) {
  await showToast({ style: Toast.Style.Animated, title: "Updating Expense" });
  try {
    const responseSubmit = await axios({
      method: "post",
      url: `https://secure.splitwise.com/api/v3.0/update_expense/${expenseID}`,
      ...HEADER,
      data: values,
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

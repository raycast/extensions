import { Transaction } from "../utils/types";
import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { preferences } from "../utils/preferences";

type TransactionResponse = {
  isLoading: boolean;
  transactions: Array<Transaction>;
  revalidate: () => void;
};

const fetchTransactions = function (searchText: string): TransactionResponse {
  const { isLoading, data, revalidate } = useFetch<{ data: Transaction[] }>(
    `https://monse.app/v1/transactions?page=1&include=category,bankAccount,bankAccount.bank&filter[text]=${searchText}&base-fiat=${preferences.currency}&per-page=30`,
    {
      headers: { Authorization: `Bearer ${preferences.token}` },
      keepPreviousData: true,
      onError: async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Request failed",
          message: "Check your token and expiration if still don't work",
        });
      },
    }
  );

  const transactions: Array<Transaction> = data === undefined ? [] : data.data;
  return { isLoading, transactions, revalidate };
};

export { fetchTransactions };

import type { ContractResponses } from "../api/contract";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { z } from "zod";
import { client } from "../api/client";
import { contract } from "../api/contract";
import { Transaction } from "../types/transaction";

type Response = ContractResponses["getTransactions"];
type Data = z.infer<(typeof contract)["getTransactions"]["responses"]["200"]>;
type Props = z.infer<(typeof contract)["getTransactions"]["query"]>;
type Options = {
  execute?: boolean;
};

const emptyData: Data = {
  transactions: [] as Transaction[],
  meta: {
    current_page: 0,
    next_page: null,
    prev_page: null,
    per_page: 0,
    total_count: 0,
    total_pages: 0,
  },
};

function getData(response?: Response) {
  return response?.status === 200 ? response.body : emptyData;
}

export function useTransactions(props: Props, options?: Options) {
  const [paginate, setPaginate] = useState(emptyData.meta);
  const [transactions, setTransactions] = useState(emptyData.transactions);

  const { isLoading, mutate, ...others } = useCachedPromise(
    async (query) => {
      const response = await client.getTransactions({ query });
      const data = getData(response);
      setPaginate(data.meta);
      setTransactions((t) => [...t, ...data.transactions]);
      return data;
    },
    [props],
    {
      execute: options?.execute,
    }
  );

  return {
    transactions,
    transactionsMeta: paginate,
    transactionsLoading: isLoading,
    transactionsMutate: async (query: Props) => {
      const response = await mutate(client.getTransactions({ query }), {
        shouldRevalidateAfter: false,
      });
      const data = getData(response);
      setPaginate(data.meta);
      setTransactions((t) => [...t, ...data.transactions]);
      return true;
    },
    ...others,
  };
}

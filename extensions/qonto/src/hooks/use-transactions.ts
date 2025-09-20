import type { ContractResponses } from "../api/contract";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { z } from "zod";
import { client } from "../api/client";
import { contract } from "../api/contract";
import { Transaction } from "../types/transaction";
import { match } from "ts-pattern";

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

async function handleErrors(response: Promise<ContractResponses["getTransactions"]>) {
  return match(await response)
    .with({ status: 400 }, ({ body }) => {
      throw new Error(body.errors[0].message);
    })
    .with({ status: 401 }, ({ body }) => {
      throw new Error(body.errors[0].detail);
    })
    .with({ status: 422 }, ({ body }) => {
      throw new Error(body.errors[0].detail);
    })
    .otherwise((resp) => resp);
}

export function useTransactions(props: Props, options?: Options) {
  const [paginate, setPaginate] = useState(emptyData.meta);
  const [transactions, setTransactions] = useState(emptyData.transactions);

  const { isLoading, mutate, error, ...others } = useCachedPromise(
    async (query) => {
      const response = await handleErrors(client.getTransactions({ query }));
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
    transactionsError: error,
    transactionsMutate: async (query: Props) => {
      const response = await mutate(handleErrors(client.getTransactions({ query })), {
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

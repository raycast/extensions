import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";
import type { TransactionFilters } from "../types";

export function useTransactions(
  apiKey: string | undefined,
  accountId: string | undefined,
  filters: TransactionFilters = {},
) {
  return usePromise(
    async (key: string, accId: string, f: TransactionFilters) => {
      const api = new MercuryApi(key);
      try {
        return await api.getTransactions(accId, f);
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? "", accountId ?? "", filters],
    { execute: !!apiKey && !!accountId },
  );
}

export function useAllTransactions(
  apiKey: string | undefined,
  filters: TransactionFilters = {},
) {
  return usePromise(
    async (key: string, f: TransactionFilters) => {
      const api = new MercuryApi(key);
      try {
        return await api.getAllTransactions(f);
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? "", filters],
    { execute: !!apiKey },
  );
}
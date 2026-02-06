import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";

export function useInvoices(apiKey: string | undefined, status?: string) {
  return usePromise(
    async (key: string, s?: string) => {
      const api = new MercuryApi(key);
      try {
        return await api.getInvoices(s);
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? "", status],
    { execute: !!apiKey },
  );
}
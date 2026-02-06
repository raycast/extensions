import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";

export function useCustomers(apiKey: string | undefined) {
  return usePromise(
    async (key: string) => {
      const api = new MercuryApi(key);
      try {
        return await api.getCustomers();
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? ""],
    { execute: !!apiKey },
  );
}
import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";

export function useCredit(apiKey: string | undefined) {
  return usePromise(
    async (key: string) => {
      const api = new MercuryApi(key);
      try {
        return await api.getCredit();
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return null;
        }
        throw error;
      }
    },
    [apiKey ?? ""],
    { execute: !!apiKey },
  );
}
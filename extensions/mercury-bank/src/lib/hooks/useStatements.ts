import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";

export function useStatements(
  apiKey: string | undefined,
  accountId: string | undefined,
) {
  return usePromise(
    async (key: string, accId: string) => {
      const api = new MercuryApi(key);
      try {
        return await api.getStatements(accId);
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? "", accountId ?? ""],
    { execute: !!apiKey && !!accountId },
  );
}
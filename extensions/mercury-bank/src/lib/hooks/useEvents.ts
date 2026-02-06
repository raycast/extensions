import { usePromise } from "@raycast/utils";
import { MercuryApi } from "../api";

export function useEvents(apiKey: string | undefined, limit = 50) {
  return usePromise(
    async (key: string, lim: number) => {
      const api = new MercuryApi(key);
      try {
        const res = await api.getEvents(lim);
        return res.events;
      } catch (error) {
        if (error instanceof Error && error.message.includes("403")) {
          return [];
        }
        throw error;
      }
    },
    [apiKey ?? "", limit],
    { execute: !!apiKey },
  );
}
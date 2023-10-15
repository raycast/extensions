import { LocalStorage } from "@raycast/api";
import dayjs from "dayjs";
import { Refreshable, Storable } from "./types";

function persistedStorage<T>({
  key,
  fetch,
  expirySeconds,
}: {
  key: string;
  fetch: () => Promise<T>;
  expirySeconds: number;
}): Refreshable<T> {
  let currentPromise: Promise<T> | null = null;
  let lastRefresh: string | null = null;

  const refresh = async () => {
    if (currentPromise) {
      return currentPromise;
    }
    lastRefresh = dayjs().toISOString();
    const fetcher = async () => {
      const data = await fetch();
      await LocalStorage.setItem(
        key,
        JSON.stringify({
          lastRefresh,
          data,
        })
      );
      return data;
    };

    currentPromise = fetcher();
    await currentPromise;
    const result = currentPromise;
    currentPromise = null;
    return result;
  };

  return {
    get: async () => {
      const rawItem = await LocalStorage.getItem<string>(key);
      if (rawItem) {
        const { lastRefresh, data } = JSON.parse(rawItem) as Storable<T>;

        if (lastRefresh && dayjs().diff(lastRefresh, "second") < expirySeconds) {
          return Promise.resolve(data);
        }
      }

      return refresh();
    },
    refresh,
    lastRefresh,
  };
}
export default persistedStorage;

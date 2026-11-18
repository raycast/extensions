import { useCachedPromise } from "@raycast/utils";
import { fetchRemoteConfig, fetchRemoteList } from "../lib/api";

export default function useRemoteList() {
  return useCachedPromise(
    async () => {
      const list = await fetchRemoteList();
      const names = list?.remotes ?? [];

      return Promise.all(
        names.map(async (name) => {
          const config = await fetchRemoteConfig(name);

          return {
            name,
            type: config.type,
            provider: config.provider,
          };
        }),
      );
    },
    [],
    { keepPreviousData: true },
  );
}

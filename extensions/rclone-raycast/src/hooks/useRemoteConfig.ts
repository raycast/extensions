import { useCachedPromise } from "@raycast/utils";
import { fetchRemoteConfig } from "../lib/api";

export default function useRemoteConfig(name: string) {
  return useCachedPromise(fetchRemoteConfig, [name], {
    keepPreviousData: true,
  });
}

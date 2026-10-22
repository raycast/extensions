import { useCachedPromise } from "@raycast/utils";
import { fetchVersions } from "../lib/commands";

export const useVersions = () => {
  const { data, isLoading, error } = useCachedPromise(fetchVersions, []);
  return { versions: data, isLoading, error };
};

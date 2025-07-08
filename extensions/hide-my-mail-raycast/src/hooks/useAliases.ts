import { useCachedPromise } from "@raycast/utils";
import { getUsedAliases } from "../services/cf/rules";
import { AliasRule } from "../types";

export function useAliases() {
  const {
    data: aliases,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (): Promise<AliasRule[]> => {
      return await getUsedAliases();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    }
  );

  return {
    aliases: aliases || [],
    error,
    isLoading,
    revalidate,
  };
}

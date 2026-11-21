import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchCommands, searchCommands } from "../lib/commands";

type UseCommandsOptions = {
  search?: string;
  version?: string;
};
export const useCommands = ({ search, version }: UseCommandsOptions) => {
  const { data, isLoading, error } = useCachedPromise(fetchCommands, [version ?? ""], { execute: Boolean(version) });
  const commands = useMemo(() => (data ? searchCommands(data, search ?? "") : undefined), [data, search]);
  return { commands, isLoading, error };
};

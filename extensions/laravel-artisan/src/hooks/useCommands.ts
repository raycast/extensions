import { useFetch } from "@raycast/utils";
import { ConsoleCommand } from "../types";
import { API_URL } from "../config";

type UseCommandsOptions = {
  search?: string;
  version?: string;
};
export const useCommands = ({ search, version }: UseCommandsOptions) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ s: search, v: version })) {
    value && query.set(key, value);
  }
  const url = `${API_URL}/commands?${query.toString()}`;
  const { data, isLoading } = useFetch<{ commands: ConsoleCommand[] }>(url, {
    method: "GET",
  });

  return {
    // Remove commands with name starting with _ (internal commands)
    commands: data?.commands?.filter((c) => !c?.name?.startsWith("_")),
    isLoading,
  };
};

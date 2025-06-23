import { useExec } from "@raycast/utils";
import { preferences } from "../preferences";
import { getExecOptions } from "../utils/exec-options";

export const useCCUsageAvailability = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  const { data, isLoading, error, revalidate } = useExec<boolean>(npxCommand, ["ccusage@latest", "--help"], {
    ...getExecOptions(),
    parseOutput: () => true, // If command succeeds, ccusage is available
    keepPreviousData: true,
  });

  return {
    isAvailable: data === true && !error,
    isLoading,
    error,
    revalidate,
  };
};

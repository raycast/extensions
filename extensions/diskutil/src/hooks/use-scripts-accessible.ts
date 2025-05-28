import { useExec } from "@raycast/utils";
import { assetsPath } from "@utils/env";

export const useScriptsAccessible = () => {
  const { isLoading: isScriptsLoading } = useExec("chmod", [
    "+x",
    `${assetsPath}/scripts/create-volume`,
    `${assetsPath}/scripts/delete-volume`,
    `${assetsPath}/scripts/askpass`,
  ]);

  return { isScriptsLoading };
};

import { useExec } from "@raycast/utils";
import { environment } from "@raycast/api";

export const useScriptsAccessible = () => {
  const { assetsPath } = environment;

  const { isLoading: isScriptsLoading } = useExec("chmod", [
    "+x",
    `${assetsPath}/scripts/create-volume`,
    `${assetsPath}/scripts/delete-volume`,
    `${assetsPath}/scripts/askpass`,
  ]);

  return { isScriptsLoading };
};

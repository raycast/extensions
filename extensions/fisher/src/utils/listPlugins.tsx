import { execSync } from "child_process";
import { getFishPath } from "./getFishPath";
import { showFailureToast } from "@raycast/utils";

export const listPlugins = () => {
  const fishPath = getFishPath();
  try {
    const result = execSync(`${fishPath} -l -c "fisher list"`, { encoding: "utf-8" });
    const parsed = result
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return parsed;
  } catch (error) {
    showFailureToast(error as Error, {
      title: "Failed to list Fisher plugins. Make sure Fish shell and Fisher are installed.",
    });
    return [];
  }
};

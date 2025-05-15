import { execSync } from "child_process";
import { getFishPath } from "./getFishPath";

export const listPlugins = () => {
  const fishPath = getFishPath();
  const result = execSync(`${fishPath} -l -c "fisher list"`, { encoding: "utf-8" });
  const parsed = result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return parsed;
};

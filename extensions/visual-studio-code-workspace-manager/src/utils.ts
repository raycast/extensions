import { lstatSync, readdirSync } from "fs-extra";
import { join } from "path";
import { workspacePath } from "./preference";

export function getProjectByName(projectName: string) {
  const WORKSPACE_DIR = workspacePath;

  const directoryFilter = (filename: string) => {
    return lstatSync(join(WORKSPACE_DIR, filename)).isDirectory();
  };

  const dirs = readdirSync(join(WORKSPACE_DIR)).filter(directoryFilter);
  const items = dirs
    .filter((item: string) => item.includes(projectName))
    .map((item: string) => join(WORKSPACE_DIR, item));

  return items;
}

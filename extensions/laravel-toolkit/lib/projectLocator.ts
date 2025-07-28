import { existsSync } from "fs";
import { join } from "path";
import { getActiveProject } from "./projectStore";

export async function findLaravelProjectRoot(): Promise<string | null> {
  const path = await getActiveProject();
  if (path && existsSync(join(path, "artisan"))) {
    return path;
  }
  return null;
}

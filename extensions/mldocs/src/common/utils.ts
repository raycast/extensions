import { environment } from "@raycast/api";
import { join as path_join } from "path";
import { mkdirSync } from "fs";

export const supportPath = (() => {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
  } catch (err) {
    console.log("Failed to create supportPath");
  }
  return environment.supportPath;
})();

export function cachePath(path: string): string {
  return path_join(supportPath, path);
}

import { environment } from "@raycast/api";
import { readLauncherOwner } from "./launcher-probe";
export type { LauncherOwner } from "./launcher-probe";

export async function getLauncherOwner(required = false) {
  try {
    return await readLauncherOwner(environment.assetsPath);
  } catch {
    if (required)
      throw new Error(
        "Run this command from the Semantic Search extension in Tinycast or Raycast and try again.",
      );
    return undefined;
  }
}

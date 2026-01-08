import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_TRY_PATH = join(homedir(), "src", "tries");

export function getTryPath(): string {
  const { tryPath } = getPreferenceValues<Preferences>();
  return tryPath || DEFAULT_TRY_PATH;
}

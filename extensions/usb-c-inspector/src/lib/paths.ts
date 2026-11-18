import { environment } from "@raycast/api";
import path from "path";

export const CLI_DIR_NAME = "whatcable-cli";
export const CLI_BINARY_NAME = "whatcable";

export function cachedCliDir(): string {
  return path.join(environment.supportPath, CLI_DIR_NAME);
}

export function cachedCliPath(): string {
  return path.join(cachedCliDir(), CLI_BINARY_NAME);
}

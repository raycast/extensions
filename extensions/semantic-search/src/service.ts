import { environment, getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { ensureService } from "./runtime";

export const sharedStorage = join(
  homedir(),
  "Library",
  "Application Support",
  "Semantic Search",
);
let startup: Promise<string> | undefined;
export function connectService(progress: (message: string) => void) {
  const custom = getPreferenceValues<{
    serviceURL?: string;
  }>().serviceURL?.trim();
  if (custom) {
    const url = new URL(custom);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.protocol !== "http:" ||
      url.username ||
      url.password
    ) {
      return Promise.reject(
        new Error("A custom service must use a local HTTP address."),
      );
    }
    return Promise.resolve(custom.replace(/\/$/, ""));
  }
  if (!startup)
    startup = ensureService({
      assets: environment.assetsPath,
      storage: sharedStorage,
      progress,
    }).catch((error) => {
      startup = undefined;
      throw error;
    });
  return startup;
}

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
export async function connectService(progress: (message: string) => void) {
  const custom = getPreferenceValues<Preferences>().serviceURL?.trim();
  if (custom) {
    let url: URL;
    try {
      url = new URL(custom);
    } catch {
      throw new Error("A custom service must use a valid local HTTP address.");
    }
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.protocol !== "http:" ||
      url.username ||
      url.password
    ) {
      throw new Error("A custom service must use a local HTTP address.");
    }
    return custom.replace(/\/$/, "");
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

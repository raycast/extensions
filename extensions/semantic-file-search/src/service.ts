import { environment, getPreferenceValues } from "@raycast/api";
import { ensureService } from "./runtime";

import { configureEngineToken, sharedStorage } from "./engine-auth";
export { engineFetch, sharedStorage } from "./engine-auth";
let startup: Promise<string> | undefined;
export async function connectService(
  progress: (message: string) => void,
  background = false,
) {
  const preferences = getPreferenceValues<Preferences>();
  const custom = preferences.serviceURL?.trim();
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
    const base = custom.replace(/\/$/, "");
    configureEngineToken(base, preferences.serviceTokenPath?.trim());
    return base;
  }
  configureEngineToken("http://127.0.0.1:8766");
  if (!startup)
    startup = ensureService({
      background,
      assets: environment.assetsPath,
      storage: sharedStorage,
      progress,
    }).catch((error) => {
      startup = undefined;
      throw error;
    });
  return startup;
}

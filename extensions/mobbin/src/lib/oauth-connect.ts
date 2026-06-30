import { MobbinMcpClient } from "./mcp-client";
import { appendDebugLog } from "./debug-log";
import type { Preferences } from "./types";

export async function connectMobbinOAuth(
  preferences: Preferences,
): Promise<void> {
  await appendDebugLog("oauth.connect.start", {
    platform: preferences.defaultPlatform,
    mode: preferences.defaultSearchMode,
    imageQuality: preferences.defaultImageQuality,
  });

  try {
    await new MobbinMcpClient().searchScreens({
      query: "login screen",
      platform: preferences.defaultPlatform,
      mode: preferences.defaultSearchMode,
      image_quality: preferences.defaultImageQuality,
      limit: 1,
      exclude_screen_ids: [],
    });
    await appendDebugLog("oauth.connect.success");
  } catch (error) {
    await appendDebugLog("oauth.connect.failure", { error });
    throw error;
  }
}

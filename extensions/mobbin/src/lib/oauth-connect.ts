import { MobbinMcpClient } from "./mcp-client";
import { appendDebugLog } from "./debug-log";

export async function connectMobbinOAuth(
  preferences: Preferences,
): Promise<void> {
  await appendDebugLog("oauth.connect.start", {
    platform: preferences.defaultPlatform,
    mode: preferences.defaultSearchMode,
    imageFormat: preferences.defaultMcpImageFormat,
  });

  try {
    const client = new MobbinMcpClient();
    try {
      await client.connect();
      const capabilities = await client.getCapabilities();
      await appendDebugLog("oauth.connect.capabilities", {
        ...capabilities,
      });
    } finally {
      await client.dispose();
    }
    await appendDebugLog("oauth.connect.success");
  } catch (error) {
    await appendDebugLog("oauth.connect.failure", { error });
    throw error;
  }
}

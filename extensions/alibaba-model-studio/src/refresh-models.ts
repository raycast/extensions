import { AI, showHUD } from "@raycast/api";
import {
  getModels,
  getPreferences,
  platformTitle,
  probeModelsEndpoint,
  probeWorkspace,
} from "./lib/catalog";
import { log } from "./lib/log";

export default async function Command() {
  const { apiKey, baseURL, platform, workspaceId } = getPreferences();

  // Raycast fires no preference-change event, so this is the one-step path
  // after editing the settings: validate the saved combination and refresh.
  // An explicit refresh must check the live endpoint, not the 60-second
  // discovery cache.
  const probeWorkspaceId = probeWorkspace(platform, workspaceId);
  try {
    // Same shape as refreshModelsWithToast: discovery and the bypassed probe
    // share one in-flight fetch, and the fresh models.dev metadata means ids
    // that are new since the last discovery register with real titles and
    // context windows on the poll that follows.
    const [models, probe] = await Promise.all([
      getModels({ bypassCache: true }),
      probeModelsEndpoint(baseURL, apiKey, probeWorkspaceId, {
        bypassCache: true,
      }),
    ]);
    await AI.refreshModels();
    if (probe.ok) {
      // Registered models, not the raw /models id count: DashScope lists many
      // non-chat services that discovery filters out, and Extra Models ids
      // never appear in the endpoint's response.
      await showHUD(
        `${platformTitle(platform)}: ${models.length} models available`,
      );
    } else {
      await showHUD(`Refreshed, but validation failed — ${probe.message}`);
    }
  } catch (error) {
    log(
      `model refresh failed (${error instanceof Error ? error.message : String(error)})`,
    );
    await showHUD("Failed to refresh Alibaba Model Studio models");
  }
}

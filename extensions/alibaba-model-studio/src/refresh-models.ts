import { AI, showHUD } from "@raycast/api";
import {
  getPreferences,
  loadModelMetadata,
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
  const probe = await probeModelsEndpoint(baseURL, apiKey, probeWorkspaceId, {
    bypassCache: true,
  });
  try {
    if (probe.ok) {
      // Bust the models.dev metadata cache before realigning Raycast's list,
      // so ids that are new since the last discovery get real titles and
      // context windows on the poll that follows.
      await loadModelMetadata(platform, { bypassCache: true });
    }
    await AI.refreshModels();
    if (probe.ok) {
      await showHUD(
        `${platformTitle(platform)}: ${probe.ids.length} models available`,
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

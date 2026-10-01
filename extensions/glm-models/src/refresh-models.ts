import { AI, showHUD } from "@raycast/api";
import {
  getPreferences,
  platformTitle,
  probeModelsEndpoint,
} from "./lib/catalog";

export default async function Command() {
  const { apiKey, baseURL, platform } = getPreferences();

  // Raycast fires no preference-change event, so this is the one-step path
  // after editing the settings: validate the saved combination and refresh.
  // An explicit refresh must check the live endpoint, not the 60-second
  // discovery cache.
  const probe = await probeModelsEndpoint(baseURL, apiKey, {
    bypassCache: true,
  });
  try {
    await AI.refreshModels();
    if (probe.ok) {
      await showHUD(
        `${platformTitle(platform)}: ${probe.ids.length} models available`,
      );
    } else {
      await showHUD(`Refreshed, but validation failed — ${probe.message}`);
    }
  } catch (error) {
    console.error(
      `glm-models: model refresh failed (${error instanceof Error ? error.message : String(error)})`,
    );
    await showHUD("Failed to refresh GLM models");
  }
}

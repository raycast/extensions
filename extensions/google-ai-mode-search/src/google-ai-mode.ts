import { open, showHUD } from "@raycast/api";

import { buildGoogleAiModeUrl } from "./url";

export async function openGoogleAiMode(query?: string): Promise<void> {
  try {
    await open(buildGoogleAiModeUrl(query));
  } catch {
    await showHUD("Could not open Google AI Mode");
  }
}

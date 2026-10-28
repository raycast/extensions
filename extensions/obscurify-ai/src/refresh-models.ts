import { AI, getPreferenceValues, showHUD } from "@raycast/api";
import { fetchCatalog } from "./catalog";

export default async function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  try {
    const models = await fetchCatalog(apiKey.trim());
    await AI.refreshModels();
    await showHUD(`Obscurify.ai: ${models.length} models available`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Could not refresh Obscurify.ai models");
  }
}

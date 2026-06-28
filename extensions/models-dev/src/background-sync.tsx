import { getPreferenceValues } from "@raycast/api";
import { fetchModelsData } from "./lib/api";

export default async function BackgroundSync() {
  const { enableBackgroundSync } = getPreferenceValues<Preferences>();
  if (!enableBackgroundSync) return;

  try {
    await fetchModelsData();
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

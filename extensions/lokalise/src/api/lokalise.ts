import { LokaliseApi } from "@lokalise/node-api";
import { getPreferenceValues } from "@raycast/api";

let lokaliseClient: LokaliseApi | null = null;

export function getLokaliseClient(): LokaliseApi {
  if (!lokaliseClient) {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.apiToken) {
      throw new Error("API token is not configured");
    }
    lokaliseClient = new LokaliseApi({ apiKey: preferences.apiToken });
  }
  return lokaliseClient;
}

export function getProjectId(): string {
  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.projectId) {
    throw new Error("Project ID is not configured");
  }
  return preferences.projectId;
}

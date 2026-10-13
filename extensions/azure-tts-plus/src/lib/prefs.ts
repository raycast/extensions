import { getPreferenceValues } from "@raycast/api";
import { AzureCredentials } from "./settings.js";

/**
 * The only place the Azure key is read. It lives in Raycast's encrypted preference
 * store and never reaches disk from here: commands pass it down as an argument, and
 * the background worker receives it in its environment block.
 */
export const getAzureCredentials = (): AzureCredentials | undefined => {
  const { speechKey, serviceRegion } = getPreferenceValues<Preferences>();
  const key = speechKey?.trim();
  const region = serviceRegion?.trim() || "eastus2";
  if (!key) return undefined;
  return { key, region };
};

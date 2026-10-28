import { getPreferenceValues, type AI } from "@raycast/api";
import { createModelProvider } from "./lib/model-provider";

function getProvider() {
  const preferences = getPreferenceValues<Preferences>();
  return createModelProvider({ baseUrl: preferences.baseUrl, apiToken: preferences.apiToken });
}

export const getModels: AI.GetModels = () => getProvider().getModels();

export const streamCompletion: AI.StreamCompletion = (model, request) => getProvider().streamCompletion(model, request);

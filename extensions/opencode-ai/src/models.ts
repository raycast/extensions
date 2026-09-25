import { getPreferenceValues, type AI } from "@raycast/api";
import { createModelProvider } from "./model-provider";

function getProvider() {
  const preferences = getPreferenceValues<Preferences>();
  return createModelProvider({
    apiKey: preferences.OPENCODE_API_KEY,
    includeZen: preferences.OPENCODE_ZEN,
    includeGo: preferences.OPENCODE_GO,
  });
}

export const getModels: AI.GetModels = () => getProvider().getModels();
export const streamCompletion: AI.StreamCompletion = (model, request) => getProvider().streamCompletion(model, request);

import { getPreferenceValues, type AI } from "@raycast/api";
import { createModelProvider } from "./model-provider";

function getProvider() {
  const preferences = getPreferenceValues<Preferences>();
  return createModelProvider({ apiKey: preferences.apiKey });
}

export const getModels: AI.GetModels = () => getProvider().getModels();
export const streamCompletion: AI.StreamCompletion = (model, request) => getProvider().streamCompletion(model, request);

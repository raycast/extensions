import { getPreferenceValues, type AI } from "@raycast/api";
import { createModelProvider } from "./model-provider";

function getProvider() {
  const { apiKey } = getPreferenceValues<Preferences>();
  return createModelProvider({ apiKey: apiKey.trim() });
}

export const getModels: AI.GetModels = () => getProvider().getModels();
export const streamCompletion: AI.StreamCompletion = (model, request) => getProvider().streamCompletion(model, request);

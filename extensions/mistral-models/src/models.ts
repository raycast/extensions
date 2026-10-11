import { getPreferenceValues, type AI } from "@raycast/api";
import { discoverModels } from "./discovery";
import { completeWithRecovery } from "./recovery";

export const getModels: AI.GetModels = () => {
  const { apiKey } = getPreferenceValues<Preferences>();
  return discoverModels(apiKey);
};

export const streamCompletion: AI.StreamCompletion = (model, request) => {
  const { apiKey } = getPreferenceValues<Preferences>();
  return completeWithRecovery(model, request, apiKey);
};

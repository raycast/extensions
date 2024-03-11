import { getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";

const prefs = getPreferenceValues();

const config = {
  apiKey: prefs.apiKey,
};
export const anthropic = new Anthropic(config);

export const global_model = prefs.model;
export const enable_streaming: boolean = prefs.enableStreaming;

import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const prefs = getPreferenceValues();

const config = {
  apiKey: prefs.apikey,
  baseURL: "https://api.perplexity.ai",
};
export const openai = new OpenAI(config);

export const global_model = prefs.model;
export const enable_streaming: boolean = prefs.enableStreaming;

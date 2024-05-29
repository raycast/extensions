import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const prefs = getPreferenceValues();

export const isPerplexityAPI = prefs.apikey.startsWith("pplx-");
const baseURL = isPerplexityAPI ? "https://api.perplexity.ai" : "https://openrouter.ai/api/v1";
const config = {
  apiKey: prefs.apikey,
  baseURL: baseURL,
};

export const openai = new OpenAI(config);

export const global_model = prefs.model;
export const enable_streaming: boolean = prefs.enableStreaming;

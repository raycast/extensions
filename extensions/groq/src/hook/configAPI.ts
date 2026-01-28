import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const prefs = getPreferenceValues();

const config = {
  apiKey: prefs.apikey,
  baseURL: "https://api.groq.com/openai/v1",
};
export const openai = new OpenAI(config);

export const global_model = prefs.model;
export const enable_streaming: boolean = prefs.enableStreaming;
export const show_metadata: boolean = prefs.showMetadata;

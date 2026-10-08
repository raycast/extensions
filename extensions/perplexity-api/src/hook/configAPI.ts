import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { AGENT_BASE_URL } from "./agent";

const prefs = getPreferenceValues();

const config = {
  apiKey: prefs.apikey,
  baseURL: AGENT_BASE_URL,
  defaultHeaders: { "X-Pplx-Integration": "raycast" },
};
export const openai = new OpenAI(config);

export const global_model = prefs.model;
export const enable_streaming: boolean = prefs.enableStreaming;

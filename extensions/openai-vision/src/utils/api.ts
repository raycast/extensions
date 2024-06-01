import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  apikey: string;
  model: string;
  enableStreaming: boolean;
  sys_prompt: string;
}

const prefs = getPreferenceValues<Preferences>();

const config = {
  apiKey: prefs.apikey,
};

export const openai = new OpenAI(config);

export const sys_prompt = prefs.model;
export const global_model = prefs.model;
export const enable_streaming = prefs.enableStreaming;

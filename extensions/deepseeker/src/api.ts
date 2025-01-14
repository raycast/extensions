import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

// if the baseurl got from the preference is empty, use the default one
export const openai = new OpenAI({
  baseURL: getPreferenceValues().baseurl || "https://api.deepseek.com/v1",
  apiKey: getPreferenceValues().apikey,
});
export const global_model = getPreferenceValues().model;

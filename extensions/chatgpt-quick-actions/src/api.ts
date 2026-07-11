import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: getPreferenceValues().apikey,
});
export const global_model = getPreferenceValues().model;

import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

// if the baseurl got from the preference is empty, use the default one
export const openai = new OpenAI({
  baseURL: getPreferenceValues().baseurl || "https://api.deepseek.com/v1",
  apiKey: getPreferenceValues().apikey,
});

// orride the global if custom model is provided
const custom_model = getPreferenceValues().custom_model;
const is_custom_model_valid = Boolean(custom_model && custom_model.length > 0);
const global_model = is_custom_model_valid ? custom_model : getPreferenceValues().model;

// debug only
console.log("custom_model: " + custom_model);
console.log("is_custom_model_valid: " + is_custom_model_valid);
console.log("global_model: " + global_model);
console.log("Using model: " + global_model);

export { global_model };

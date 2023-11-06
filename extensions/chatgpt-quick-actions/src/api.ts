import { getPreferenceValues } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: getPreferenceValues().apikey,
});
export const openai = new OpenAIApi(configuration);
export const global_model = getPreferenceValues().model;

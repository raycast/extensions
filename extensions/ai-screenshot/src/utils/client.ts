import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

export async function createClient() {
  const preferences = getPreferenceValues<Preferences>();
  let client: OpenAI;
  try {
    client = new OpenAI({ apiKey: preferences.apiKey });
  } catch (error) {
    console.error("Client could not be created: ", error);
    return;
  }
  return client;
}

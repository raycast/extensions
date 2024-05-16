import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

export async function createClient() {
  const preferences = getPreferenceValues<Preferences>();
  let client: OpenAI;
  if (preferences.client === "openai") {
    try {
      client = new OpenAI({ apiKey: preferences.apiKey });
    } catch (error) {
      console.error("Client could not be created: ", error);
      return;
    }
  } else {
    console.error("Client type not recognized or supported.");
    return;
  }
  return client;
}

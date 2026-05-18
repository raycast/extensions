import { getPreferenceValues } from "@raycast/api";
import "../lib/polyfill/node-fetch";

const pref = getPreferenceValues<Preferences>();
const key = pref.ollamaApiKey;

type Input = {
  /**
   * The URL to fetch
   */
  url: string;
};

/**
 * Ollama API for Web Fetch.
 */
export default async function tool(input: Input): Promise<string> {
  /* Throw Error if API Key isn't configured */
  if (!key) throw new Error("Ollama API key is not configured in Raycast preferences");

  /* Ollama Web Fetch */
  try {
    /* API POST Request */
    const response = await fetch("https://ollama.com/api/web_fetch", {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    /* Check Response Code */
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`HTTP Error, Status: ${response.status}, Message: ${errorMsg}`);
    }

    /* Stringify JSON */
    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    console.error("Ollama Web Fetch tool error:", error);
    throw error;
  }
}

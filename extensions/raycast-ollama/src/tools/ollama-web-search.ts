import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const pref = getPreferenceValues<Preferences>();
const key = pref.ollamaApiKey;

type Input = {
  /**
   * The search query string
   */
  query: string;
  /**
   * Maximum results to return (default 5, max 10)
   */
  max_result?: number;
};

/**
 * Ollama API for Web Search.
 */
export default async function tool(input: Input): Promise<string> {
  /* Throw Error if API Key isn't configured */
  if (key === undefined) throw new Error("Ollama Api Key need to be configured on Raycast Command Extension");

  /* Parse max_result */
  if (input.max_result && input.max_result > 10) input.max_result = 10;
  if (input.max_result && input.max_result < 1) input.max_result = 1;

  /* Ollama Web Search */
  try {
    /* API POST Request */
    const response = await fetch("https://ollama.com/api/web_search", {
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
      throw new Error(`<error>HTTP Error, Status: ${response.status}, Message: ${errorMsg} </error>`);
    }

    /* Stringify JSON */
    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    console.error("Error on Ollama Web Search Tool", error);
    throw error;
  }
}

import { AI } from "@raycast/api";
import fetch from "node-fetch";

/**
 * AI Action to query the personal RAG knowledge base.
 * This is the function that allows Raycast AI to call your RAG.
 * @param query The natural language question to ask the knowledge base.
 * @returns A promise that resolves with the context from the RAG server.
 */
export default async function queryRagBrain(query: string): Promise<string> {
  if (!query) {
    return "Error: No query provided to the knowledge base.";
  }

  const ragBrainUrl = "https://rag.petermsimon.com/query";

  try {
    const response = await fetch(ragBrainUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error: Knowledge base responded with status ${response.status}. ${errorText}`;
    }

    const jsonResponse = (await response.json()) as { results: any };
    return JSON.stringify(jsonResponse.results); // Return the raw results for AI processing
    
  } catch (error: any) {
    console.error("Failed to query RAG brain:", error);
    return `Error: Failed to connect to the knowledge base. Details: ${error.message}`;
  }
}

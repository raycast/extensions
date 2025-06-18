import fetch from "node-fetch";
import { Prompt, ApiResponse, CreatePromptRequest } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

const API_BASE_URL = "https://pb.onlinestool.com/api";

function getHeaders(): Record<string, string> {
  const preferences = getPreferenceValues<Preferences>();
  return {
    "Content-Type": "application/json",
    "x-api-key": preferences.apiKey,
  };
}

export async function fetchPrompts(): Promise<Prompt[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<Prompt[]>;
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    throw error;
  }
}

export async function createPrompt(prompt: CreatePromptRequest): Promise<Prompt> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(prompt),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<Prompt>;
    if (!data.data) {
      throw new Error("No data returned from API");
    }
    return data.data;
  } catch (error) {
    console.error("Failed to create prompt:", error);
    throw error;
  }
}

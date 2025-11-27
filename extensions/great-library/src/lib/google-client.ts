import { GoogleGenAI } from "@google/genai";
import { getExtensionPreferences } from "./preferences";

let client: GoogleGenAI | null = null;

export function getGoogleClient(): GoogleGenAI {
  if (!client) {
    const { apiKey } = getExtensionPreferences();
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

import { Clipboard, showHUD, getSelectedText as raycastGetSelectedText, getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

/**
 * Get the current clipboard content
 * @returns Promise<string> The clipboard content
 */
export async function getClipboardContent(): Promise<string> {
  const text = await Clipboard.readText();
  return text || "";
}

/**
 * Get the currently selected text using Raycast's native API
 * @returns Promise<string> The selected text
 */
export async function getSelectedText(): Promise<string> {
  try {
    return await raycastGetSelectedText();
  } catch (error) {
    console.error("Error getting selected text:", error);
    throw new Error("No text selected");
  }
}

/**
 * Replace the selected text with new text using Raycast's native API
 * @param text The text to replace the selection with
 */
export async function replaceSelectedText(text: string): Promise<void> {
  const cleanText = text
    .replace(/^["']|["']$/g, "") // Remove quotes at start/end
    .replace(/\n*Translation:.*$/gs, "") // Remove "Translation:" suffix if present
    .trim();

  if (!cleanText) {
    throw new Error("No text to paste");
  }

  await Clipboard.paste(cleanText);
  await showHUD("Text replaced");
}

/**
 * Get the LLM model from preferences
 * @returns string The model name to use
 */
export function getLLMModel(): string {
  const preferences = getPreferenceValues();
  return preferences.llmModel || "gpt-4o-mini";
}

/**
 * Clean and improve text using OpenAI
 * @param text The text to clean
 * @param openai OpenAI instance
 * @returns Promise<string> The cleaned text
 */
export async function cleanText(text: string, openai: OpenAI): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content:
          "You are a text improvement assistant. Fix grammar, punctuation, and spelling while preserving the original meaning and tone. Respond ONLY with the corrected text.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content?.trim() || text;
}

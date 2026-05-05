import { createCard } from "../lib/api";

/**
 * Save a note or URL to Teak.
 */
export default async function tool(content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error("Provide text or a URL to save.");
  }

  const result = await createCard({
    content: normalizedContent,
    source: "raycast_ai_tool",
  });

  return `Saved to Teak: ${result.cardId}`;
}

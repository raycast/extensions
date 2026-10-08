import { createCard } from "../lib/api";
import { extractFirstHttpUrl } from "../lib/capture";

/**
 * Save a note or URL to Teak.
 */
export default async function tool(content: string) {
  if (!content.trim()) {
    throw new Error("Provide text or a URL to save.");
  }

  const url = extractFirstHttpUrl(content);

  const result = await createCard(
    {
      cardType: url ? undefined : "text",
      content,
      source: "raycast_ai_tool",
      url: url ?? undefined,
    },
    // AI tools run headless — never open the browser sign-in overlay.
    { interactive: false },
  );

  return `Saved to Teak: ${result.cardId}`;
}

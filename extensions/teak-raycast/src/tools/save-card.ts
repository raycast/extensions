import { createCard } from "../lib/api";
import { extractFirstHttpUrl } from "../lib/capture";

export default async function tool(content: string) {
  if (!content.trim()) {
    throw new Error("Provide text or a URL to save.");
  }

  const url = extractFirstHttpUrl(content);

  const result = await createCard(
    {
      content,
      source: "raycast_ai_tool",
      url: url ?? undefined,
    },
    "silent",
  );

  return result.resaved
    ? `Already in Teak, moved to the top: ${result.cardId}`
    : `Saved to Teak: ${result.cardId}`;
}

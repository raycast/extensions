import { getCardById } from "../lib/api";

type Input = {
  /** The Teak card id to fetch. */
  cardId: string;
};

export default async function tool(input: Input) {
  const card = await getCardById(input.cardId);

  return {
    aiSummary: card.aiSummary,
    aiTags: card.aiTags,
    appUrl: card.appUrl,
    cardId: card.id,
    content: card.content,
    createdAt: card.createdAt,
    isFavorited: card.isFavorited,
    notes: card.notes,
    tags: card.tags,
    title: card.metadataTitle ?? (card.content.slice(0, 80) || "Untitled"),
    type: card.type,
    updatedAt: card.updatedAt,
    url: card.url,
  };
}

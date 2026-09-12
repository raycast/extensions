import { getStudyResults } from "../utils/ai-flashcards";
import { cardsToMarkdown } from "../utils/serializer";
import { Progress } from "../types";

export type StudyInput = {
  tag?: string;
  progress?: Progress;
  limit?: number;
};

export type StudyResult = {
  count: number;
  cards: string;
};

export default async function studyFlashcards(input: StudyInput = {}): Promise<StudyResult> {
  const cards = await getStudyResults(input.tag, input.progress, input.limit);
  return { count: cards.length, cards: cardsToMarkdown(cards) };
}

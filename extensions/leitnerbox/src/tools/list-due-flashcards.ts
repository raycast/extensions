import { getQuestions, summarizeQuestion } from "../lib/questions";

type Input = {
  /**
   * Include answers in the response so the user can study with full context.
   */
  includeAnswers?: boolean;
  /**
   * Maximum number of due flashcards to return. Defaults to 25.
   */
  limit?: number;
};

/**
 * List flashcards that are due for review today without changing review progress.
 */
export default async function tool(input: Input = {}) {
  const questions = await getQuestions();
  const limit = input.limit && input.limit > 0 ? input.limit : 25;
  const dueFlashcards = questions
    .map((question) =>
      summarizeQuestion(question, {
        includeAnswer: input.includeAnswers,
      }),
    )
    .filter((summary) => summary.due);
  const flashcards = dueFlashcards.slice(0, limit);

  return {
    totalDue: dueFlashcards.length,
    returned: flashcards.length,
    flashcards,
  };
}

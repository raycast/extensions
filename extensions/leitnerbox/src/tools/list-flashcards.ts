import { getQuestions, summarizeQuestion } from "../lib/questions";

type Input = {
  /**
   * Include answers in the response. Leave false when the user only needs a deck overview.
   */
  includeAnswers?: boolean;
  /**
   * Maximum number of flashcards to return. Defaults to 25.
   */
  limit?: number;
};

/**
 * List flashcards in the Leitner box without changing review progress.
 */
export default async function tool(input: Input = {}) {
  const questions = await getQuestions();
  const limit = input.limit && input.limit > 0 ? input.limit : 25;
  const flashcards = questions.slice(0, limit).map((question) =>
    summarizeQuestion(question, {
      includeAnswer: input.includeAnswers,
    }),
  );

  return {
    total: questions.length,
    returned: flashcards.length,
    flashcards,
  };
}

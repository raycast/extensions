import { createQuestion, saveQuestion, summarizeQuestion } from "../lib/questions";

type Input = {
  /**
   * The question to add to the Leitner box.
   */
  question: string;
  /**
   * The answer the learner should recall when reviewing the card.
   */
  answer: string;
};

/**
 * Create a new Leitner flashcard in Box 1.
 */
export default async function tool(input: Input) {
  const questionText = input.question.trim();
  const answerText = input.answer.trim();

  if (!questionText || !answerText) {
    throw new Error("Both question and answer are required to create a flashcard.");
  }

  const question = createQuestion(questionText, answerText);

  await saveQuestion(question);

  return {
    message: "Created a new Leitner flashcard.",
    flashcard: summarizeQuestion(question, { includeAnswer: true }),
  };
}

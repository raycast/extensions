import { remoApi } from "../utils/api";

type Input = {
  /**
   * The natural-language question to answer using the user's notes.
   */
  question: string;
};

/**
 * Answer a question using the user's Remo notes as context. Returns an answer with citations
 * and the source notes it relied on. Locked notes are excluded from the answer.
 */
export default async function tool(input: Input) {
  const result = await remoApi.askAi(input.question);

  return {
    answer: result.answer,
    citations: result.citations,
    sources: result.matches.map((match) => ({
      id: match.noteId,
      title: match.title,
      score: match.score,
      snippet: match.snippet,
    })),
  };
}

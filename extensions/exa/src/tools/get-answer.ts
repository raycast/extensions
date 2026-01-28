import exa from "../exa";

type Input = {
  /**
   * The query to search for.
   */
  query: string;
  /**
   * The model to use for the answer.
   *
   * @default "exa"
   *
   * @remarks
   * Use "exa-pro" for a more accurate answer on complex queries. It performs two additional search queries.
   */
  model?: "exa" | "exa-pro";
};

const tool = async (input: Input) => {
  const { query } = input;

  const { answer, citations } = await exa.answer(query, { model: input.model || "exa" });

  return {
    answer,
    citations: citations.map((citation) => ({
      title: citation.title,
      url: citation.url,
    })),
  };
};

export default tool;

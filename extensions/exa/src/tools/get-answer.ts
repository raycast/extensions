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

  // Pass through the requested model when provided so "exa-pro" is honored.
  const modelOptions = input.model ? ({ model: input.model } as Parameters<typeof exa.answer>[1]) : undefined;
  const { answer, citations } = await exa.answer(query, modelOptions);

  return {
    answer,
    citations: citations.map((citation) => ({
      title: citation.title,
      url: citation.url,
    })),
  };
};

export default tool;

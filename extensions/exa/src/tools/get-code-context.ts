import { getCodeContext } from "../exa";

type Input = {
  /**
   * The coding, docs, or framework question to retrieve context for.
   */
  query: string;
  /**
   * The number of tokens to target. If omitted, Exa chooses dynamically.
   */
  tokensNum?: number;
};

export default async function (input: Input) {
  const response = await getCodeContext(input.query, input.tokensNum ?? "dynamic");

  return {
    query: response.query,
    response: response.response,
    requestId: response.requestId,
    resultsCount: response.resultsCount,
    outputTokens: response.outputTokens,
    searchTime: response.searchTime,
  };
}

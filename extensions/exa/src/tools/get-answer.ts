import { compactAnswerResponse, getGroundedAnswer } from "../exa";

type Input = {
  /**
   * The query to search for.
   */
  query: string;
};

const tool = async (input: Input) => {
  const { query } = input;

  return compactAnswerResponse(await getGroundedAnswer(query));
};

export default tool;

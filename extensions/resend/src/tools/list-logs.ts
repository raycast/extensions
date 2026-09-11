import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of API request logs to return. */
  limit?: number;
  /** Return logs after this cursor. */
  after?: string;
  /** Return logs before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().logs.list(compactPagination(input));
  return unwrapResponse(response, "list API request logs");
};

export default withResend(tool);

import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of broadcasts to return. */
  limit?: number;
  /** Return broadcasts after this cursor. */
  after?: string;
  /** Return broadcasts before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().broadcasts.list(compactPagination(input));
  return unwrapResponse(response, "list broadcasts");
};

export default withResend(tool);

import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of segments to return. */
  limit?: number;
  /** Return segments after this cursor. */
  after?: string;
  /** Return segments before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().segments.list(compactPagination(input));
  return unwrapResponse(response, "list segments");
};

export default withResend(tool);

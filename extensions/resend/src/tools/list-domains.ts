import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of domains to return. */
  limit?: number;
  /** Return domains after this cursor. */
  after?: string;
  /** Return domains before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().domains.list(compactPagination(input));
  return unwrapResponse(response, "list domains");
};

export default withResend(tool);

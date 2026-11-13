import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of templates to return. */
  limit?: number;
  /** Return templates after this cursor. */
  after?: string;
  /** Return templates before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().templates.list(compactPagination(input));
  return unwrapResponse(response, "list templates");
};

export default withResend(tool);

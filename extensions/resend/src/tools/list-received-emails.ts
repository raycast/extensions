import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of emails to return. */
  limit?: number;
  /** Return emails after this cursor. */
  after?: string;
  /** Return emails before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().emails.receiving.list(compactPagination(input));
  return unwrapResponse(response, "list received emails");
};

export default withResend(tool);

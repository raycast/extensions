import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** Maximum number of webhooks to return. */
  limit?: number;
  /** Return webhooks after this cursor. */
  after?: string;
  /** Return webhooks before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().webhooks.list(compactPagination(input));
  return unwrapResponse(response, "list webhooks");
};

export default withResend(tool);

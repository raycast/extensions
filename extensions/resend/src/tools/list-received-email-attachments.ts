import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /** The inbound email ID. Get it from list-received-emails. */
  emailId: string;
  /** Maximum number of attachments to return. */
  limit?: number;
  /** Return attachments after this cursor. */
  after?: string;
  /** Return attachments before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().emails.receiving.attachments.list({
    emailId: input.emailId,
    ...compactPagination(input),
  });
  return unwrapResponse(response, "list received email attachments");
};

export default withResend(tool);

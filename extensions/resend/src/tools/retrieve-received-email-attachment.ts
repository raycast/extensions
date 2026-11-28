import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The inbound email ID. Get it from list-received-emails. */
  emailId: string;
  /** The attachment ID. Get it from list-received-email-attachments or retrieve-received-email. */
  attachmentId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().emails.receiving.attachments.get({
    emailId: input.emailId,
    id: input.attachmentId,
  });
  return unwrapResponse(response, "retrieve received email attachment");
};

export default withResend(tool);

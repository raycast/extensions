import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The inbound email ID. Get it from list-received-emails. */
  emailId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().emails.receiving.get(input.emailId);
  return unwrapResponse(response, "retrieve received email");
};

export default withResend(tool);

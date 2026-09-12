import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The domain ID. Get it from list-domains. */
  domainId: string;
  /** The domain name, shown only in the confirmation dialog. */
  domainName: string;
};

const tool = async (input: Input) => {
  const response = await getResend().domains.verify(input.domainId);
  return unwrapResponse(response, "verify domain");
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  title: "Verify Domain",
  message: "Ask Resend to check this domain's DNS records?",
  info: [
    { name: "Domain", value: input.domainName },
    { name: "Domain ID", value: input.domainId },
  ],
});

export default withResend(tool);

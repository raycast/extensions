import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The domain ID. Get it from list-domains. */
  domainId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().domains.get(input.domainId);
  return unwrapResponse(response, "retrieve domain");
};

export default withResend(tool);

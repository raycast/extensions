import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The request log ID. Get it from list-logs. */
  logId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().logs.get(input.logId);
  return unwrapResponse(response, "retrieve API request log");
};

export default withResend(tool);

import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The broadcast ID. Get it from list-broadcasts. */
  broadcastId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().broadcasts.get(input.broadcastId);
  return unwrapResponse(response, "retrieve broadcast");
};

export default withResend(tool);

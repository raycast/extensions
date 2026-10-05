import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The segment ID. Get it from list-segments. */
  segmentId: string;
};

const tool = async (input: Input) => {
  const response = await getResend().segments.get(input.segmentId);
  return unwrapResponse(response, "retrieve segment");
};

export default withResend(tool);

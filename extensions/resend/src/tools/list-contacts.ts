import { getResend, withResend } from "../lib/oauth";
import { compactPagination, unwrapResponse } from "./utils";

type Input = {
  /**
   * Segment ID to filter by. Get it from list-segments.
   */
  segmentId?: string;
  /** Legacy audience ID to filter by. Prefer segmentId for new calls. */
  audienceId?: string;
  /** Maximum number of contacts to return. */
  limit?: number;
  /** Return contacts after this cursor. */
  after?: string;
  /** Return contacts before this cursor. */
  before?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().contacts.list({
    ...compactPagination(input),
    ...(input.segmentId ? { segmentId: input.segmentId } : {}),
    ...(input.audienceId ? { audienceId: input.audienceId } : {}),
  });
  return unwrapResponse(response, "list contacts");
};

export default withResend(tool);

import { withResend } from "../lib/oauth";
import { retrievePosition } from "../lib/positions";

type Input = {
  /** Position ID from list-positions. */
  positionId: string;
};

export default withResend(async (input: Input) => retrievePosition(input.positionId));

import { withResend } from "../lib/oauth";
import { listPositions } from "../lib/positions";

export default withResend(async () => listPositions());

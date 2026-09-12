import { checkExpirations } from "./lib/Pins";
import { checkDelayedExecutions } from "./lib/scheduled-execution";

/**
 * Raycast command to check for expired pins. Runs on an interval. This command should rarely be used manually, and it should (generally) not be disabled.
 */
export default async function CheckExpirationsCommand() {
  await checkDelayedExecutions();
  await checkExpirations();
}

import { runTool } from "../moment.ts";

/**
 * Reads the timer: idle, running, paused or finished; a focus session, a
 * break, or none; the seconds left and the session's whole length in seconds.
 */
export default async function tool() {
  return runTool("checkTimer");
}

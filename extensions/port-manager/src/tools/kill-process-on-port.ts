import { Action, Tool } from "@raycast/api";
import Process from "../models/Process";
import { KillSignal, kill, waitForExit } from "../utilities/killProcess";
import { CommandExitError } from "../utilities/runCommand";

type Input = {
  /** The TCP port number, from 1 to 65535. */
  port: number;
};

export const confirmation: Tool.Confirmation<Input> = async ({ port }) => ({
  style: Action.Style.Destructive,
  message: `Kill the process listening on port ${port}?`,
});

/** Kill the process listening on a TCP port after the user confirms the action. */
export default async function tool({ port }: Input) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "The port must be an integer between 1 and 65535.";
  }

  let pids: string[];
  try {
    pids = await Process.getListeningPids(String(port));
  } catch (error) {
    if (!(
      error instanceof CommandExitError &&
      error.exitCode === 1 &&
      error.stdout.length === 0 &&
      error.stderr.length === 0
    )) {
      throw error;
    }
    pids = [];
  }

  const uniquePids = [...new Set(pids.map(Number))];
  if (uniquePids.length === 0) return `No process is listening on port ${port}.`;

  await kill(uniquePids, KillSignal.TERM);
  const stillRunning = await waitForExit(uniquePids);
  if (stillRunning.length > 0) {
    return `SIGTERM was sent to port ${port}, but process ${stillRunning.join(", ")} is still running.`;
  }

  return `Killed process ${uniquePids.join(", ")} listening on port ${port}.`;
}

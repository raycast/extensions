import { Action, Tool } from "@raycast/api";
import Process from "../models/Process";
import { KillSignal, kill, killall, waitForExit } from "../utilities/killProcess";
import { isWindows } from "../utilities/platform";

type Input = {
  /** PID of the listening process from list-open-ports. For target "parent", pass the child's PID, not its parentPid. */
  pid: number;
  /** Kill this process, every process with its name, or its parent. */
  target: "process" | "all" | "parent";
  /** Use SIGTERM by default, or SIGKILL when requested. Windows always uses taskkill. */
  signal?: "term" | "kill";
};

export const confirmation: Tool.Confirmation<Input> = async ({ pid, target }) => ({
  style: Action.Style.Destructive,
  message:
    target === "all"
      ? `Kill all processes sharing the name of process ${pid}?`
      : target === "parent"
        ? `Kill the parent of process ${pid}?`
        : `Kill process ${pid}?`,
});

/** Perform a kill action from Open Ports for a PID returned by list-open-ports. */
export default async function tool({ pid, target, signal = "term" }: Input) {
  if (!Number.isInteger(pid) || pid <= 0) return "The PID must be a positive integer.";

  const process = (await Process.getCurrent()).find((item) => item.pid === pid);
  if (process === undefined) return `Process ${pid} is not listening on an open TCP port.`;

  const killSignal = signal === "kill" ? KillSignal.KILL : KillSignal.TERM;
  if (target === "all") {
    if (process.name === undefined) return `Process ${pid} has no name to use for Kill All.`;
    await killall(process.name, killSignal);
    return `Sent a termination request to all processes named "${process.name}".`;
  }

  if (target === "parent" && (process.parentPid === undefined || process.parentPid <= (isWindows ? 4 : 1))) {
    return `Process ${pid} has no parent that can be killed.`;
  }

  const targetPid = target === "parent" ? process.parentPid! : pid;
  await kill(targetPid, killSignal);
  const stillRunning = await waitForExit(targetPid);
  if (stillRunning.length > 0) return `Process ${targetPid} is still running after the termination request.`;
  return `Killed ${target === "parent" ? "parent " : ""}process ${targetPid}.`;
}

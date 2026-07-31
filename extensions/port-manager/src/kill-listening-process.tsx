import { LaunchProps, showToast, Toast } from "@raycast/api";
import { CommandExitError, runCommand } from "./utilities/runCommand";

function isInteger(str: string): boolean {
  return /^\d+$/.test(str);
}

function isLsofNoMatch(error: unknown) {
  return (
    error instanceof CommandExitError && error.exitCode === 1 && error.stdout.length === 0 && error.stderr.length === 0
  );
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.KillListeningProcess }>) {
  const { port } = props.arguments;
  if (!isInteger(port)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Bad Port",
      message: "The port must be an integer.",
    });
    return;
  }

  try {
    let pids: string[];

    try {
      const { stdout } = await runCommand("/usr/sbin/lsof", ["-n", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
        timeout: 5_000,
        killProcessGroup: true,
      });
      pids = stdout.split(/\s+/).filter(Boolean);
    } catch (error) {
      if (!isLsofNoMatch(error)) throw error;
      pids = [];
    }

    if (pids.length === 0) throw new Error(`No process is listening on port ${port}.`);

    await runCommand("/bin/kill", pids, { timeout: 2_000 });
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: `Process ${pids.join(", ")} was killed.`,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

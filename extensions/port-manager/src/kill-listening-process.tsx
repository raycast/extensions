import { LaunchProps, showToast, Toast } from "@raycast/api";
import Process from "./models/Process";
import { KillSignal, Survivor, kill, killSurvivor, processFingerprint, waitForExit } from "./utilities/killProcess";
import { CommandExitError } from "./utilities/runCommand";

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
      pids = await Process.getListeningPids(port);
    } catch (error) {
      if (!isLsofNoMatch(error)) throw error;
      pids = [];
    }

    if (pids.length === 0) throw new Error(`No process is listening on port ${port}.`);

    await kill(pids.map(Number), KillSignal.TERM);

    // `kill` only reports delivery; make sure the processes actually went away.
    const survivorPids = await waitForExit(pids.map(Number));

    if (survivorPids.length > 0) {
      const survivors: Survivor[] = await Promise.all(
        survivorPids.map(async (pid) => ({ pid, startedAt: await processFingerprint(pid) })),
      );

      showToast({
        style: Toast.Style.Failure,
        title: "Process Still Running",
        message: `Process ${survivorPids.join(", ")} did not exit after SIGTERM.`,
        primaryAction: {
          title: "Force Kill (SIGKILL)",
          onAction: async (toast) => {
            toast.style = Toast.Style.Animated;
            toast.title = "Force Killing…";
            toast.primaryAction = undefined;

            const failures: string[] = [];
            for (const survivor of survivors) {
              try {
                await killSurvivor(survivor, KillSignal.KILL);
              } catch (error) {
                failures.push(error instanceof Error ? error.message : String(error));
              }
            }
            const stillRunning = await waitForExit(survivors.map((survivor) => survivor.pid));

            if (failures.length > 0 || stillRunning.length > 0) {
              toast.style = Toast.Style.Failure;
              toast.title = "Force Kill Failed";
              toast.message = [...failures, ...stillRunning.map((pid) => `Process ${pid} is still running`)].join(" ");
              return;
            }

            toast.style = Toast.Style.Success;
            toast.title = "Success";
            toast.message = `Process ${survivorPids.join(", ")} was killed.`;
          },
        },
      });
      return;
    }

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

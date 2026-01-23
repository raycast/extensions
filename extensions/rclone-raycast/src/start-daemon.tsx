import { Action, ActionPanel, Detail, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { spawn } from "node:child_process";
import { fetchPid } from "./lib/api";

type DaemonStatus = "checking" | "starting" | "running" | "error" | "stopped";

const RCLONE_CMD = "rclone";
const RCLONE_ARGS = ["rcd", "--rc-no-auth"];
const STATUS_POLL_ATTEMPTS = 10;
const STATUS_POLL_DELAY_MS = 1000;

export default function Command() {
  const [status, setStatus] = useState<DaemonStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [daemonPid, setDaemonPid] = useState<number>();
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureDaemonIsRunning() {
      try {
        const pid = await fetchDaemonPidOrThrow();
        if (!cancelled) {
          setDaemonPid(pid);
          setStatus("running");
        }
        return;
      } catch {
        // If the daemon is not reachable we fall through to start it.
      }

      if (!cancelled) {
        setStatus("starting");
      }

      try {
        await startDaemonProcess();
        const pid = await waitForDaemonReady();
        if (!cancelled) {
          setDaemonPid(pid);
          setStatus("running");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        }
      }
    }

    void ensureDaemonIsRunning();

    return () => {
      cancelled = true;
    };
  }, []);

  const contentForStatus = useMemo(() => getContentForStatus(status, errorMessage), [status, errorMessage]);

  async function handleStopDaemon() {
    setIsStopping(true);
    try {
      const pidToStop = daemonPid ?? (await fetchDaemonPidOrThrow());
      await terminateDaemon(pidToStop);
      setDaemonPid(undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Daemon stopped",
        message: "The rclone daemon has been stopped.",
      });
      await popToRoot();
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      setStatus("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop daemon",
        message,
      });
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <Detail
      markdown={contentForStatus}
      isLoading={status === "checking" || status === "starting" || isStopping}
      actions={
        status === "running" ? (
          <ActionPanel>
            <Action
              title={isStopping ? "Stopping…" : "Stop Daemon"}
              onAction={handleStopDaemon}
              icon={Icon.Eject}
              style={Action.Style.Destructive}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

async function startDaemonProcess() {
  await new Promise<void>((resolve, reject) => {
    try {
      const child = spawn(RCLONE_CMD, RCLONE_ARGS, {
        detached: true,
        stdio: "ignore",
      });

      child.on("error", reject);
      child.unref();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function waitForDaemonReady() {
  for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
    try {
      const pid = await fetchDaemonPidOrThrow();
      return pid;
    } catch (error) {
      if (attempt === STATUS_POLL_ATTEMPTS - 1) {
        throw error;
      }
      await delay(STATUS_POLL_DELAY_MS);
    }
  }
}

async function fetchDaemonPidOrThrow() {
  const response = await fetchPid();
  const pid = response?.pid;
  if (typeof pid !== "number") {
    throw new Error("Failed to determine the rclone PID");
  }
  return pid;
}

async function terminateDaemon(pid: number) {
  try {
    // On Windows, SIGTERM is not supported, so we call kill without a signal
    // On Unix, we use SIGTERM for graceful termination
    if (process.platform === "win32") {
      process.kill(pid);
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (!nodeError || nodeError.code !== "ESRCH") {
      throw error;
    }
  }

  for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
    try {
      await fetchDaemonPidOrThrow();
      await delay(STATUS_POLL_DELAY_MS);
    } catch {
      return;
    }
  }

  throw new Error("rclone daemon did not exit in time");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

function getContentForStatus(status: DaemonStatus, errorMessage?: string) {
  switch (status) {
    case "checking":
      return `# Checking rclone...\n\nLooking for an existing rclone RC daemon at \`http://localhost:5572\`.`;
    case "starting":
      return `# Starting rclone...\n\nLaunching \`rclone ${RCLONE_ARGS.join(" ")}\` and waiting for the RC daemon to respond.`;
    case "running":
      return `# rclone is running!\n\nThe RC daemon is accepting requests at \`http://localhost:5572\`, you can continue using the extension.`;
    case "stopped":
      return `# rclone daemon stopped.\n\nThe RC daemon has been stopped. Reopen this command to start it again.`;
    case "error":
      return `# Failed to start rclone ):\n\n${errorMessage ?? "Unknown error"}`;
    default:
      return `# rclone daemon is in an unknown status.\n\nPlease try again.`;
  }
}

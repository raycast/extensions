import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { isOmlxInstalled, isServerRunning } from "./lib/omlx";

const execAsync = promisify(exec);

const OMLX_CLI = `${process.env.HOME}/.omlx/bin/omlx`;

type ServerState = "running" | "stopped" | "checking" | "not-installed";

export default function StartStop() {
  const [state, setState] = useState<ServerState>("checking");

  async function checkState() {
    setState("checking");
    if (!isOmlxInstalled()) {
      setState("not-installed");
      return;
    }
    const running = await isServerRunning();
    setState(running ? "running" : "stopped");
  }

  async function waitForServer(
    target: boolean,
    maxAttempts = 10,
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const running = await isServerRunning();
      if (running === target) return true;
    }
    return false;
  }

  async function startServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting oMLX...",
    });
    try {
      await execAsync(`"${OMLX_CLI}" start`);
      const started = await waitForServer(true);
      if (started) {
        setState("running");
        toast.style = Toast.Style.Success;
        toast.title = "oMLX started";
      } else {
        await checkState();
        toast.style = Toast.Style.Failure;
        toast.title = "oMLX is taking longer than expected to start";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start oMLX";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function stopServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping oMLX...",
    });
    try {
      await execAsync(`"${OMLX_CLI}" stop`);
      const stopped = await waitForServer(false);
      if (stopped) {
        setState("stopped");
        toast.style = Toast.Style.Success;
        toast.title = "oMLX stopped";
      } else {
        await checkState();
        toast.style = Toast.Style.Failure;
        toast.title = "oMLX is taking longer than expected to stop";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop oMLX";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function restartServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting oMLX...",
    });
    try {
      await execAsync(`"${OMLX_CLI}" restart`);
      const restarted = await waitForServer(true);
      if (restarted) {
        setState("running");
        toast.style = Toast.Style.Success;
        toast.title = "oMLX restarted";
      } else {
        await checkState();
        toast.style = Toast.Style.Failure;
        toast.title = "oMLX is taking longer than expected to restart";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restart oMLX";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  useEffect(() => {
    checkState();
  }, []);

  if (state === "not-installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="oMLX Not Found"
          description="Install oMLX from omlx.com, then launch it once to generate the config file."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download oMLX"
                url="https://omlx.com"
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={checkState}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={state === "checking"}>
      <List.EmptyView
        icon={state === "running" ? Icon.CheckCircle : Icon.XMarkCircle}
        title={
          state === "checking"
            ? "Checking..."
            : state === "running"
              ? "oMLX Server Running"
              : "oMLX Server Stopped"
        }
        description={
          state === "running"
            ? "Press Enter to stop the server"
            : state === "stopped"
              ? "Press Enter to start the server"
              : undefined
        }
        actions={
          <ActionPanel>
            {state === "running" && (
              <>
                <Action
                  title="Stop Server"
                  icon={Icon.Stop}
                  onAction={stopServer}
                />
                <Action
                  title="Restart Server"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={restartServer}
                />
              </>
            )}
            {state === "stopped" && (
              <Action
                title="Start Server"
                icon={Icon.Play}
                onAction={startServer}
              />
            )}
            <Action
              title="Refresh Status"
              icon={Icon.ArrowClockwise}
              onAction={checkState}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

import { randomUUID } from "node:crypto";

import { Toast, open, showToast } from "@raycast/api";
import openUrl from "open";

import { buildElsewhereUrl, ElsewhereCommand } from "./control-url";
import { ElsewhereCommandResult, ElsewhereSnapshotV1, readElsewhereState } from "./state-reader";
import { successToastTitle } from "./success-toast";

const CORRELATION_TIMEOUT_MS = 3_000;
const POLL_INTERVAL_MS = 80;

let commandQueue: Promise<void> = Promise.resolve();

function requestId(): string {
  return `raycast_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

interface CorrelatedResult {
  result: ElsewhereCommandResult;
  snapshot: ElsewhereSnapshotV1;
}

async function waitForCorrelatedResult(id: string): Promise<CorrelatedResult | null> {
  const deadline = Date.now() + CORRELATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await readElsewhereState();
    if (state.kind === "ready" || state.kind === "stale") {
      if (state.snapshot.lastCommand?.requestId === id) {
        return {
          result: state.snapshot.lastCommand,
          snapshot: state.snapshot,
        };
      }
    }
    await delay(POLL_INTERVAL_MS);
  }
  return null;
}

interface ExecuteCommandOptions {
  successTitle: string;
  onSettled?: () => void | Promise<void>;
}

async function sendCommand(command: ElsewhereCommand, options: ExecuteCommandOptions): Promise<void> {
  const correlationId = requestId();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Sending to Elsewhere…",
  });

  try {
    const url = buildElsewhereUrl(command, correlationId);
    if (command.kind === "volume") {
      await openUrl(url, { background: true });
    } else {
      await open(url);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Reach Elsewhere";
    toast.message =
      error instanceof Error ? error.message : "Make sure Elsewhere is installed and has been opened once.";
    await options.onSettled?.();
    return;
  }

  try {
    const correlated = await waitForCorrelatedResult(correlationId);
    if (!correlated) {
      toast.style = Toast.Style.Success;
      toast.title = "Command Sent";
      toast.message = "Elsewhere did not publish a correlated result in time.";
    } else if (correlated.result.status === "error") {
      toast.style = Toast.Style.Failure;
      toast.title = "Elsewhere Could Not Complete the Command";
      toast.message =
        correlated.result.message ?? correlated.result.code ?? "The app reported an unknown command error.";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = successToastTitle(command, correlated.snapshot, options.successTitle);
      toast.message = undefined;
    }
  } catch {
    toast.style = Toast.Style.Success;
    toast.title = "Command Sent";
    toast.message = "Raycast could not read Elsewhere’s correlated result.";
  }
  await options.onSettled?.();
}

export function executeElsewhereCommand(command: ElsewhereCommand, options: ExecuteCommandOptions): Promise<void> {
  const queued = commandQueue.then(() => sendCommand(command, options));
  commandQueue = queued.catch(() => undefined);
  return queued;
}

import { randomUUID } from "node:crypto";

import { Toast, open, showToast } from "@raycast/api";

import { buildElsewhereUrl, ElsewhereCommand } from "./control-url";
import { ElsewhereCommandResult, readElsewhereState } from "./state-reader";
import { dispatchElsewhereUrlInBackground } from "./url-dispatcher";

const CORRELATION_TIMEOUT_MS = 3_000;
const POLL_INTERVAL_MS = 80;

let commandQueue: Promise<void> = Promise.resolve();

function requestId(): string {
  return `raycast_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForCorrelatedResult(id: string): Promise<ElsewhereCommandResult | null> {
  const deadline = Date.now() + CORRELATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await readElsewhereState();
    if (state.kind === "ready" || state.kind === "stale") {
      if (state.snapshot.lastCommand?.requestId === id) return state.snapshot.lastCommand;
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
      await dispatchElsewhereUrlInBackground(url);
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
    const result = await waitForCorrelatedResult(correlationId);
    if (!result) {
      toast.style = Toast.Style.Success;
      toast.title = "Command Sent";
      toast.message = "Elsewhere did not publish a correlated result in time.";
    } else if (result.status === "error") {
      toast.style = Toast.Style.Failure;
      toast.title = "Elsewhere Could Not Complete the Command";
      toast.message = result.message ?? result.code ?? "The app reported an unknown command error.";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = options.successTitle;
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

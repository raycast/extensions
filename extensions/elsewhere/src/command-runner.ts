import { randomUUID } from "node:crypto";

import { Toast, showToast } from "@raycast/api";
import openUrl from "open";

import { buildElsewhereUrl, ElsewhereCommand } from "./control-url";
import {
  PreparedSpaceCreateRequest,
  prepareSpaceCreateRequest,
  removeSpaceCreateRequest,
} from "./space-create-request";
import { ElsewhereCommandResult, ElsewhereSnapshotV1, readElsewhereState } from "./state-reader";
import { successToastTitle } from "./success-toast";

const CORRELATION_TIMEOUT_MS = 3_000;
const CREATE_SPACE_CORRELATION_TIMEOUT_MS = 40_000;
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

async function waitForCorrelatedResult(
  id: string,
  timeoutMilliseconds = CORRELATION_TIMEOUT_MS,
): Promise<CorrelatedResult | null> {
  const deadline = Date.now() + timeoutMilliseconds;
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

interface ToastFeedback {
  style: Toast.Style;
  title: string;
  message?: string;
}

async function presentFeedback(toast: Toast | undefined, feedback: ToastFeedback): Promise<void> {
  if (!toast) {
    await showToast(feedback);
    return;
  }

  toast.style = feedback.style;
  toast.title = feedback.title;
  toast.message = feedback.message;
}

async function sendCommand(command: ElsewhereCommand, options: ExecuteCommandOptions): Promise<void> {
  const correlationId = requestId();
  const toast =
    command.kind === "volume"
      ? undefined
      : await showToast({
          style: Toast.Style.Animated,
          title: "Sending to Elsewhere…",
        });

  try {
    const url = buildElsewhereUrl(command, correlationId);
    await openUrl(url, { background: true });
  } catch (error) {
    await presentFeedback(toast, {
      style: Toast.Style.Failure,
      title: "Could Not Reach Elsewhere",
      message: error instanceof Error ? error.message : "Make sure Elsewhere is installed and has been opened once.",
    });
    await options.onSettled?.();
    return;
  }

  try {
    const correlated = await waitForCorrelatedResult(correlationId);
    if (!correlated) {
      await presentFeedback(toast, {
        style: Toast.Style.Success,
        title: "Command Sent",
        message: "Elsewhere did not publish a correlated result in time.",
      });
    } else if (correlated.result.status === "error") {
      await presentFeedback(toast, {
        style: Toast.Style.Failure,
        title: "Elsewhere Could Not Complete the Command",
        message: correlated.result.message ?? correlated.result.code ?? "The app reported an unknown command error.",
      });
    } else {
      await presentFeedback(toast, {
        style: Toast.Style.Success,
        title: successToastTitle(command, correlated.snapshot, options.successTitle),
      });
    }
  } catch {
    await presentFeedback(toast, {
      style: Toast.Style.Success,
      title: "Command Sent",
      message: "Raycast could not read Elsewhere’s correlated result.",
    });
  }
  await options.onSettled?.();
}

export function executeElsewhereCommand(command: ElsewhereCommand, options: ExecuteCommandOptions): Promise<void> {
  const queued = commandQueue.then(() => sendCommand(command, options));
  commandQueue = queued.catch(() => undefined);
  return queued;
}

async function sendCommandForAi(command: ElsewhereCommand): Promise<ElsewhereCommandResult> {
  const correlationId = requestId();
  const isSpaceCreation = command.kind === "space" && command.action === "create";
  let nonce: string | undefined;
  let request: PreparedSpaceCreateRequest | undefined;
  if (command.kind === "space" && command.action === "create") {
    nonce = randomUUID().replaceAll("-", "");
    request = await prepareSpaceCreateRequest(correlationId, nonce, command.prompt);
  }

  try {
    await openUrl(buildElsewhereUrl(command, correlationId, nonce), { background: true });
  } catch (error) {
    if (request) await removeSpaceCreateRequest(request.requestPath);
    throw new Error(
      `Could not reach Elsewhere: ${error instanceof Error ? error.message : "Make sure Elsewhere is installed and has been opened once."}`,
    );
  }

  let correlated: CorrelatedResult | null;
  try {
    correlated = await waitForCorrelatedResult(
      correlationId,
      isSpaceCreation ? CREATE_SPACE_CORRELATION_TIMEOUT_MS : CORRELATION_TIMEOUT_MS,
    );
  } finally {
    if (request) await removeSpaceCreateRequest(request.requestPath);
  }
  if (!correlated) {
    throw new Error("Elsewhere did not confirm the request in time. Open Elsewhere and try again.");
  }
  if (correlated.result.status === "error") {
    throw new Error(correlated.result.message ?? correlated.result.code ?? "Elsewhere could not complete the request.");
  }
  return correlated.result;
}

/**
 * Runs an AI-initiated command and requires Elsewhere to publish its correlated result.
 *
 * Unlike a regular Raycast command, an AI tool must return a deterministic success or
 * failure so the conversation can accurately report what Elsewhere did.
 */
export function executeElsewhereCommandForAi(command: ElsewhereCommand): Promise<ElsewhereCommandResult> {
  const queued = commandQueue.then(() => sendCommandForAi(command));
  commandQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { setTimeout } from "node:timers/promises";
import { runMise, type RunResult } from "../mise/exec";
import type { MiseLocation } from "../mise/locate";
import { failureMessage, parseProgressLine, type MiseOperation, type Retry } from "../mise/operations";
import { readPreferences } from "./preferences";
import { resolveMiseFromRaycast } from "./useMise";

let running = false;

type Outcome = { style: Toast.Style; title: string; message?: string; logs?: string };

// Resolves with mise's output once it has run, or undefined when it never started.
export async function runOperation(
  location: MiseLocation,
  op: MiseOperation,
  onSuccess?: () => void,
): Promise<RunResult | undefined> {
  if (running) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Already running",
      message: "Wait for the current mise command",
    });
    return undefined;
  }
  running = true;
  const { closeAfterAction } = readPreferences();
  if (closeAfterAction) await closeMainWindow({ clearRootSearch: false });
  const controller = new AbortController();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: op.title,
    primaryAction: { title: "Cancel", onAction: () => controller.abort() },
  });
  let summary: string | undefined;
  let outcome: Outcome;
  let result: RunResult | undefined;
  const runStep = (args: string[]) =>
    runMise(location, args, {
      signal: controller.signal,
      onLine: (line) => {
        const progress = parseProgressLine(line);
        if (!progress) return;
        if (progress.kind === "summary") summary = progress.message;
        toast.message = progress.message;
      },
    });
  try {
    result = await runStep(op.args);
    for (const args of op.andThen ?? []) {
      if (controller.signal.aborted || result.code !== 0) break;
      result = await runStep(args);
    }
    if (controller.signal.aborted) outcome = { style: Toast.Style.Failure, title: "Cancelled", message: op.title };
    else if (result.code === 0) outcome = { style: Toast.Style.Success, title: op.successTitle, message: summary };
    else outcome = failure(op, result.stderr);
  } catch (error) {
    outcome = failure(op, error instanceof Error ? error.message : String(error));
  } finally {
    running = false;
  }
  await toast.hide();
  if (closeAfterAction) await showHUD(outcome.title);
  else {
    const retry = outcome.logs === undefined ? undefined : op.retry?.(outcome.logs);
    await showToast({
      ...outcome,
      primaryAction: retry ? retryAction(location, retry, onSuccess) : copyLogs(outcome.logs),
      secondaryAction: retry ? copyLogs(outcome.logs) : undefined,
    });
  }
  if (outcome.style === Toast.Style.Success) onSuccess?.();
  return result;
}

function failure(op: MiseOperation, logs: string): Outcome {
  return { style: Toast.Style.Failure, title: op.failureTitle, message: failureMessage(logs), logs };
}

function retryAction(location: MiseLocation, retry: Retry, onSuccess?: () => void): Toast.ActionOptions {
  return { title: retry.title, onAction: () => void runOperation(location, retry.op, onSuccess) };
}

function copyLogs(logs: string | undefined): Toast.ActionOptions | undefined {
  return logs === undefined ? undefined : { title: "Copy Logs", onAction: () => Clipboard.copy(logs) };
}

// A no-view command exits as soon as this returns, taking its toast with it; the Brew extension's
// clean-up holds a failure toast for 3s so its Copy Logs action can be used, and so does this.
export async function runOperationWithoutView(op: MiseOperation, onSuccess?: () => void): Promise<void> {
  const mise = await resolveMiseFromRaycast();
  if (!("path" in mise)) {
    await showHUD("mise not found — set Mise Path in preferences");
    return;
  }
  const result = await runOperation(mise, op, onSuccess);
  if (result?.code !== 0) await setTimeout(3000);
}

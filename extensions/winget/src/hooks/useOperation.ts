/**
 * Live operation state for views, plus the two launch lanes:
 *
 * - Lane B (long ops): write the materialized request to a per-id file, then
 *   launchCommand the runner with only {requestId} as context. The platform
 *   pops to root for view→no-view launches — "launch and let go" — so ALL
 *   feedback before the launch happens here, and nothing after the await is
 *   relied upon.
 * - Lane A (fast, bounded ops — pin/unpin/export): run the same engine
 *   in-view under the same global lock; no pop, instant feedback.
 *
 * Cancellation is keyed to the LOCK's opId (op-state can briefly lag or be
 * absent); views write the cancel file silently after a confirmAlert — the
 * runner owns all cancel feedback.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, Clipboard, confirmAlert, Icon, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";

import { failureDetails, failureTitle, showBusyToast } from "../core/feedback";
import {
  acknowledgeFailure,
  createOperationRequest,
  discardOperationRequest,
  inspectOperationGate,
  type OperationGate,
  type OperationRequest,
  type OperationState,
  readUnacknowledgedFailure,
  requestCancel,
  writeOperationRequest,
} from "../core/operations";
import { runOperation } from "../core/runner";

const TICK_MS = 1_000;
/** The runner command name (also the user-visible Upgrade All command). */
const RUNNER_COMMAND = "upgrade-all";

interface UseOperationResult {
  gate: OperationGate;
  /**
   * Lane B: hand the operation to the detached runner (pops to root).
   * Resolves true when the launch was dispatched.
   */
  launchDetached: (request: Omit<OperationRequest, "requestId">) => Promise<boolean>;
  /** Lane A: run a fast operation in this view's worker (no pop). */
  runInline: (request: Omit<OperationRequest, "requestId">) => Promise<OperationState | null>;
  /** Ask the running operation to cancel (confirmed; runner owns feedback). */
  cancelActive: () => Promise<void>;
}

function gatesEqual(a: OperationGate, b: OperationGate): boolean {
  if (a.status !== b.status) return false;
  const aState = "opState" in a ? a.opState : null;
  const bState = "opState" in b ? b.opState : null;
  return aState?.updatedAt === bState?.updatedAt && aState?.opId === bState?.opId;
}

function useOperation(): UseOperationResult {
  const [gate, setGate] = useState<OperationGate>(() => inspectOperationGate());
  const gateRef = useRef(gate);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = inspectOperationGate();
      if (!gatesEqual(gateRef.current, next)) {
        gateRef.current = next;
        setGate(next);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Surface an unobserved failure once (the user may have been away when a
  // detached operation failed; toasts don't persist). Acknowledge only after
  // the toast was actually delivered.
  useEffect(() => {
    const failure = readUnacknowledgedFailure();
    if (!failure) {
      return;
    }
    const details = failureDetails(failure);
    void showToast({
      style: Toast.Style.Failure,
      title: `Last operation failed: ${failureTitle(failure)}`,
      message: failure.errorMessage ?? failure.message,
      primaryAction: {
        title: "Copy Error Details",
        onAction: () => {
          void Clipboard.copy(details);
        },
      },
    }).then(() => acknowledgeFailure(failure));
  }, []);

  const launchDetached = useCallback(async (definition: Omit<OperationRequest, "requestId">) => {
    const currentGate = inspectOperationGate();
    if (currentGate.status === "busy") {
      await showBusyToast(currentGate.title);
      return false;
    }
    const request = createOperationRequest(definition);
    writeOperationRequest(request);
    try {
      // The platform pops this view to root and kills its worker as part of
      // the launch — nothing after this await is guaranteed to run.
      await launchCommand({
        name: RUNNER_COMMAND,
        type: LaunchType.UserInitiated,
        context: { requestId: request.requestId },
      });
      return true;
    } catch (error) {
      // The runner never launched, so nothing will consume the request;
      // remove it so it cannot be executed by a later launch.
      discardOperationRequest(request.requestId);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start the operation",
        message:
          error instanceof Error && /disabled/i.test(error.message)
            ? "Enable the 'Upgrade All Packages' command in Raycast settings. It runs this extension's operations"
            : error instanceof Error
              ? error.message
              : undefined,
      });
      return false;
    }
  }, []);

  const runInline = useCallback(async (definition: Omit<OperationRequest, "requestId">) => {
    const currentGate = inspectOperationGate();
    if (currentGate.status === "busy") {
      await showBusyToast(currentGate.title);
      return null;
    }
    return runOperation(createOperationRequest(definition));
  }, []);

  const cancelActive = useCallback(async () => {
    const currentGate = inspectOperationGate();
    if (currentGate.status !== "busy" || !currentGate.lockOpId) {
      return;
    }
    const confirmed = await confirmAlert({
      title: `Cancel ${currentGate.title.toLowerCase()}?`,
      message: "The package may be left in an inconsistent state.",
      icon: Icon.XMarkCircle,
      primaryAction: {
        title: "Cancel Operation",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Keep Running" },
    });
    if (confirmed) {
      // Keyed to the lock — authoritative even when op-state lags behind.
      requestCancel(currentGate.lockOpId);
    }
  }, []);

  return { gate, launchDetached, runInline, cancelActive };
}

export { useOperation, type UseOperationResult };

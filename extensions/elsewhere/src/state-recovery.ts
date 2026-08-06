import { confirmAlert, Icon, open, showToast, Toast } from "@raycast/api";

import { buildElsewhereUrl } from "./control-url";
import { elsewhereRecoveryCopy } from "./recovery-copy";
import { ElsewhereSnapshotV1, ElsewhereStateReadResult, readElsewhereState } from "./state-reader";

const READY_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 100;

type ReadyAction = (snapshot: ElsewhereSnapshotV1) => void | Promise<void>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForReadyState(): Promise<ElsewhereStateReadResult> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let state = await readElsewhereState();
  while (Date.now() < deadline) {
    if (state.kind === "ready" && state.snapshot.ready) return state;
    await delay(POLL_INTERVAL_MS);
    state = await readElsewhereState();
  }
  return state;
}

async function openElsewhereAndRetry(toast: Toast, onReady: ReadyAction): Promise<void> {
  toast.style = Toast.Style.Animated;
  toast.title = "Opening Elsewhere…";
  toast.message = "Waiting for its controls to become ready.";
  toast.primaryAction = undefined;

  try {
    await open(buildElsewhereUrl({ kind: "navigation", destination: "main" }));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Open Elsewhere";
    toast.message = error instanceof Error ? error.message : "Make sure Elsewhere is installed.";
    return;
  }

  const state = await waitForReadyState();
  if (state.kind !== "ready" || !state.snapshot.ready) {
    const copy = elsewhereRecoveryCopy(state);
    toast.style = Toast.Style.Failure;
    toast.title = copy.title;
    toast.message =
      state.kind === "ready" && state.snapshot.requiresSetup
        ? "Finish setup in Elsewhere, then run the command again."
        : "Elsewhere did not become ready in time. Run the command again to retry.";
    return;
  }

  try {
    await toast.hide();
    await onReady(state.snapshot);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Retry the Command";
    toast.message = error instanceof Error ? error.message : "Run the command again from Raycast.";
    await toast.show();
  }
}

export async function recoverElsewhereState(state: ElsewhereStateReadResult, onReady: ReadyAction): Promise<void> {
  const copy = elsewhereRecoveryCopy(state);
  if (!copy.canOpenAndRetry) {
    await showToast({
      style: Toast.Style.Failure,
      title: copy.title,
      message: copy.message,
    });
    return;
  }

  const shouldOpen = await confirmAlert({
    icon: Icon.AppWindow,
    title: copy.title,
    message: copy.message,
    primaryAction: {
      title: "Open Elsewhere and Retry",
    },
    dismissAction: {
      title: "Not Now",
    },
  });
  if (!shouldOpen) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening Elsewhere…",
    message: "Waiting for its controls to become ready.",
  });
  await openElsewhereAndRetry(toast, onReady);
}

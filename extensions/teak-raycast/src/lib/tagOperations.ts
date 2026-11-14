import { showToast, Toast } from "@raycast/api";
import {
  getRecoveryHint,
  getTagOperation,
  getUserFacingErrorMessage,
  type RaycastTagOperation,
  startTagOperation,
} from "./api";

const POLL_INTERVAL_MS = 1000;
// Teak gives up on a tag change that makes no progress for two minutes.
const MAX_POLLS = 150;

export type TagChange =
  | { kind: "delete"; tag: string }
  | { kind: "merge"; into: string; tag: string }
  | { kind: "rename"; tag: string; to: string };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Starts the change, then polls until Teak has rewritten every card. */
export const runTagOperation = async (
  change: TagChange,
  options: { onStarted?: () => void; pollIntervalMs?: number } = {},
): Promise<RaycastTagOperation> => {
  let operation = await startTagOperation(change, "interactive");
  options.onStarted?.();
  for (
    let poll = 0;
    operation.status === "running" && poll < MAX_POLLS;
    poll += 1
  ) {
    await sleep(options.pollIntervalMs ?? POLL_INTERVAL_MS);
    operation = await getTagOperation(operation.id, "interactive");
  }
  return operation;
};

const titles = {
  delete: { done: "Tag deleted", running: "Deleting tag…" },
  merge: { done: "Tags merged", running: "Merging tags…" },
  rename: { done: "Tag renamed", running: "Renaming tag…" },
} as const;

/**
 * Runs a tag change behind a toast; true when every card was rewritten.
 * `onStarted` runs once Teak accepts the change, before it finishes.
 */
export const changeTagWithFeedback = async (
  change: TagChange,
  onFinished: () => void,
  onStarted?: () => void,
): Promise<boolean> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: titles[change.kind].running,
  });
  try {
    const operation = await runTagOperation(change, { onStarted });
    if (operation.status === "completed") {
      toast.style = Toast.Style.Success;
      toast.title = titles[change.kind].done;
      toast.message = `${operation.changed} card${operation.changed === 1 ? "" : "s"} updated`;
      onFinished();
      return true;
    }
    toast.style = Toast.Style.Failure;
    toast.title =
      operation.status === "failed"
        ? "Tag change failed"
        : "Still working on it";
    toast.message =
      operation.status === "failed"
        ? (operation.error ?? "Teak couldn't finish the change.")
        : "Teak is still updating your cards. Check back in a moment.";
    onFinished();
    return false;
  } catch (error) {
    const hint = getRecoveryHint(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't change the tag";
    toast.message = hint
      ? `${getUserFacingErrorMessage(error)} ${hint}`
      : getUserFacingErrorMessage(error);
    return false;
  }
};

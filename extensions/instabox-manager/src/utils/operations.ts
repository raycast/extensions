import { showToast, Toast } from "@raycast/api";
import { waitForOperation } from "../services/lifecycle";
import { Operation } from "../types";
import { showError } from "./errors";
import { operationProgress } from "./machine-state";

interface TrackOptions {
  /** Shown while the operation runs, e.g. "Pausing claude-dev". */
  title: string;
  successTitle: string;
  successMessage?: (operation: Operation) => string | undefined;
  /** Called once InstaBox accepted the change, before it is done. */
  onAccepted?: (operation: Operation) => void;
}

/**
 * Sends a lifecycle request and follows the operation it returns until it is done.
 * InstaBox answers changes with `202 Accepted`, which does not mean the machine is ready yet.
 */
export async function runOperation(start: () => Promise<Operation>, options: TrackOptions) {
  const toast = await showToast({ style: Toast.Style.Animated, title: options.title });
  try {
    const accepted = await start();
    options.onAccepted?.(accepted);
    return await trackOperation(accepted, options, toast);
  } catch (error) {
    await showError(error, { toast });
    return undefined;
  }
}

export async function trackOperation(operation: Operation, options: TrackOptions, existingToast?: Toast) {
  const toast = existingToast ?? (await showToast({ style: Toast.Style.Animated, title: options.title }));
  try {
    const done = await waitForOperation(operation, (current) => {
      toast.message = operationProgress(current);
    });
    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    toast.message = options.successMessage?.(done);
    return done;
  } catch (error) {
    await showError(error, { toast, title: `Could not finish: ${options.title}` });
    return undefined;
  }
}

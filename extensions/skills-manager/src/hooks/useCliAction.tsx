import { Clipboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { DeployConflictView } from "../components/DeployConflictView";
import { CliError, errorMessage, isLockContention, targetConflicts } from "../lib/errors";

/** Raw stderr when we have it — that is what is worth pasting into an issue. */
function errorDetail(error: unknown): string {
  return error instanceof CliError && error.raw ? error.raw : errorMessage(error);
}

export interface CliActionOptions<T> {
  /** Title while the command runs. */
  pending: string;
  run: () => Promise<T>;
  /** Toast copy on success. Name the object and the target, not just "Done". */
  success: (result: T) => { title: string; message?: string };
  failureTitle: string;
  /** Runs after a successful command — revalidate anything the mutation invalidated. */
  onSuccess?: (result: T) => void;
}

/**
 * Outcome of a CLI action.
 *
 * `ok` is what callers must branch on. A successful command can legitimately
 * return an undefined `value` — `runCli` yields undefined for the commands that
 * succeed silently — so the value alone cannot tell success from failure.
 */
export type CliActionResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Runs a mutating CLI command with the feedback every one of them needs:
 * a progress toast, a concrete success message, and error handling that
 * distinguishes the failures a user can act on.
 *
 * A refused deploy gets its own screen rather than a toast, because the
 * conflicting paths and the fact that nothing was touched do not fit in one.
 */
export function useCliAction() {
  const { push } = useNavigation();

  return useCallback(
    async function run<T>(options: CliActionOptions<T>): Promise<CliActionResult<T>> {
      const toast = await showToast({ style: Toast.Style.Animated, title: options.pending });

      let result: T;
      // Only the command itself is guarded. Composing the toast copy or
      // revalidating afterwards must not be reported as the command failing —
      // by then the mutation has already been applied.
      try {
        result = await options.run();
      } catch (error) {
        const conflicts = targetConflicts(error);
        if (conflicts.length > 0) {
          toast.hide();
          push(<DeployConflictView conflicts={conflicts} onResolved={() => options.onSuccess?.(undefined as T)} />);
          return { ok: false };
        }

        toast.style = Toast.Style.Failure;
        toast.title = options.failureTitle;
        toast.message = isLockContention(error)
          ? "The Skills Manager app is holding the repository lock. Try again in a moment."
          : errorMessage(error);
        toast.primaryAction = {
          title: "Copy Error",
          shortcut: { modifiers: ["cmd", "shift"], key: "c" },
          onAction: () => Clipboard.copy(errorDetail(error)),
        };
        return { ok: false };
      }

      // The command already landed, so nothing here may report failure — but a
      // throw while composing the toast or revalidating would otherwise leave
      // the toast spinning forever and swallow the refresh.
      try {
        const { title, message } = options.success(result);
        toast.style = Toast.Style.Success;
        toast.title = title;
        toast.message = message;
      } catch (error) {
        toast.style = Toast.Style.Success;
        toast.title = "Done";
        toast.message = `The command succeeded, but its result could not be read: ${errorMessage(error)}`;
      }

      try {
        options.onSuccess?.(result);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not refresh",
          message: errorMessage(error),
        });
      }

      return { ok: true, value: result };
    },
    [push],
  );
}

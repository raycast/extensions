import { Toast, showToast } from "@raycast/api";
import { DependencyList, Dispatch, SetStateAction, useEffect, useState } from "react";
import { friendlyError } from "./tabstack";

export interface AsyncCommandContext {
  /** Whether the effect was cleaned up (e.g. the command re-ran or unmounted) before this check. */
  isCancelled: () => boolean;
  toast: Toast;
  setMarkdown: Dispatch<SetStateAction<string>>;
}

export interface AsyncCommandLoadingToast {
  title: string;
  message: string;
}

/**
 * Shared plumbing for Tabstack commands: shows a loading toast, runs `run`,
 * and on failure renders `friendlyError(error)` under `failureHeading` while
 * flipping the toast to an error state. Guards every state update against
 * the effect having been cancelled (re-run or unmount) in between.
 */
export function useAsyncCommand(
  initialMarkdown: string,
  deps: DependencyList,
  loadingToast: AsyncCommandLoadingToast,
  failureHeading: string,
  run: (ctx: AsyncCommandContext) => Promise<void>,
) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: loadingToast.title,
        message: loadingToast.message,
      });
      try {
        await run({ isCancelled: () => cancelled, toast, setMarkdown });
      } catch (error) {
        if (cancelled) return;
        const message = friendlyError(error);
        setMarkdown(`## ${failureHeading}\n\n${message}`);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = message;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { markdown, setMarkdown, isLoading };
}

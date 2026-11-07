import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import type { RexInstall } from "./cli";
import { captureBlock } from "./snapshot";
import { sessionKey, type RexSession } from "./types";

export interface ScreenPreview {
  /** The selected pane's screen. Never another pane's while a new selection loads. */
  screen?: string;
  isLoading: boolean;
}

/**
 * The selected pane's screen, captured again for each new snapshot `revision`.
 *
 * Only primitive keys trigger a capture, so one snapshot means one capture. A newer capture, a hidden
 * preview, or unmounting aborts the capture in flight.
 */
export function useScreenPreview(
  install: RexInstall | undefined,
  session: RexSession | undefined,
  blockId: string | undefined,
  revision: string | undefined,
  enabled: boolean,
): ScreenPreview {
  const abortable = useRef<AbortController>(null);
  const selection = session && blockId ? `${sessionKey(session)}/${blockId}` : undefined;
  const execute = enabled && !!install && !!selection && !!revision;
  const { data, isLoading } = usePromise(
    async (target: string | undefined, snapshotRevision: string | undefined) => {
      if (!install || !session || !blockId || !target || !snapshotRevision) return undefined;
      const signal = abortable.current?.signal;
      let text: string | undefined;
      try {
        text = await captureBlock(install, session, blockId, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        // Remember a completed, unavailable preview so it does not look like a new selection.
      }
      return { target, revision: snapshotRevision, text };
    },
    [selection, revision],
    {
      execute,
      abortable,
      // The detail says "No screen to show." A toast for every failed capture would be noise.
      onError: () => undefined,
    },
  );
  return {
    screen: data && data.target === selection ? data.text : undefined,
    isLoading: execute && (isLoading || data?.target !== selection || data?.revision !== revision),
  };
}

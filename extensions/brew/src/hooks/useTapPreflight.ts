import { useEffect, useRef, useState } from "react";
import { usePromise } from "@raycast/utils";
import { forgetRepoReads, getErrorMessage, preflightTap, type Preflight, type TapTarget } from "../utils";
import { fetchLogger } from "../utils/logger";

/** How long typing must pause before the check runs. A paste skips it. */
const DEBOUNCE_MS = 400;

/**
 * Answers for this command's lifetime. A check is a git read of up to six
 * repositories, about a second each, so editing back to the same text should
 * not pay for it again. "Couldn't look" is not kept: it is the one answer that
 * a moment later can change.
 */
const answers = new Map<string, Preflight>();

async function check(
  key: string,
  attempt: number,
  signal: AbortSignal | undefined,
): Promise<{ key: string; value: Preflight }> {
  const known = answers.get(key);
  if (known) return { key, value: known };
  const started = performance.now();
  const target = JSON.parse(key) as TapTarget;
  const value: Preflight = await preflightTap(target, undefined, signal).catch((err: unknown) => ({
    kind: "unchecked" as const,
    reason: getErrorMessage(err),
  }));
  fetchLogger.log("Tap preflight", {
    target: key,
    result: value.kind,
    ms: Math.round(performance.now() - started),
    refreshes: attempt,
  });
  // "Couldn't look" and an answer missing a lead it couldn't read may both
  // change a moment later; only a final answer is kept.
  if (!signal?.aborted && value.kind !== "unchecked" && !("incomplete" in value)) answers.set(key, value);
  return { key, value };
}

/**
 * What the repository behind a typed or pasted tap holds, read with git
 * without cloning it (see `preflightTap`). `checking` while it runs; undefined
 * when there is no target. `recheck` runs it again from scratch, for Refresh:
 * it forgets this target's answer and every remembered repository read, so a
 * "not found" can become an answer once git is signed in.
 *
 * `text` is the search bar's text. When it grew by more than one character at
 * once, it was pasted (or passed as a launch argument), so there is no typing
 * to wait out and the check runs at once.
 */
export function useTapPreflight(
  target: TapTarget | undefined,
  text: string,
): { preflight: Preflight | "checking" | undefined; recheck: () => void } {
  const key = target ? JSON.stringify(target) : undefined;
  // The target once typing has paused. Only the timer lives in this effect;
  // the read itself goes through `usePromise` below.
  const [settled, setSettled] = useState<string>();
  // Bumped by Refresh. Part of the check's arguments, so a recheck is one
  // argument change and one run, never a revalidate plus an `execute` flip.
  const [attempt, setAttempt] = useState(0);
  const previousText = useRef("");
  // Whether the last change to the text was a paste. Kept until the text
  // changes again, so a target that becomes checkable a moment after the
  // paste (Search first asks whether the tap is added) still skips the wait.
  const pasted = useRef(false);

  // Declared first, so it runs before the effect below in the same commit.
  useEffect(() => {
    pasted.current = text.length - previousText.current.length > 1;
    previousText.current = text;
  }, [text]);

  useEffect(() => {
    // A new target waits its own pause, even one checked before (A → B → A).
    setSettled(undefined);
    if (!key || answers.has(key)) return;
    const timer = setTimeout(() => setSettled(key), pasted.current ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Runs per target, not per keystroke: `key` describes `target` fully, and
    // the text only decides the delay.
  }, [key]);

  const abortable = useRef<AbortController>(null);
  const ready = key !== undefined && settled === key && !answers.has(key);
  const { data, isLoading } = usePromise(
    (k: string, attempt: number) => check(k, attempt, abortable.current?.signal),
    [settled ?? "", attempt],
    {
      execute: ready,
      abortable,
    },
  );

  // A recheck shows as checking again, not as the answer it is replacing.
  const preflight = !key
    ? undefined
    : (answers.get(key) ?? (data?.key === key && !isLoading ? data.value : "checking"));
  const recheck = () => {
    if (!key) return;
    answers.delete(key);
    forgetRepoReads();
    // A target answered from `answers` never settled: settling it starts the check.
    setSettled(key);
    setAttempt((n) => n + 1);
  };
  return { preflight, recheck };
}

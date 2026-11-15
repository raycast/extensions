import { useEffect, useRef, useState } from "react";
import { getErrorMessage, preflightTap, type Preflight, type TapTarget } from "../utils";
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

/**
 * What the repository behind a typed or pasted tap holds, read with git
 * without cloning it (see `preflightTap`). `checking` while it runs; undefined
 * when there is no target.
 *
 * `text` is the search bar's text. When it grew by more than one character at
 * once, it was pasted (or passed as a launch argument), so there is no typing
 * to wait out and the check runs at once.
 */
export function useTapPreflight(target: TapTarget | undefined, text: string): Preflight | "checking" | undefined {
  const key = target ? JSON.stringify(target) : undefined;
  const [answer, setAnswer] = useState<{ key: string; value: Preflight }>();
  const previousText = useRef("");

  useEffect(() => {
    const pasted = text.length - previousText.current.length > 1;
    if (!target || !key || answers.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        const started = performance.now();
        const value: Preflight = await preflightTap(target, undefined, controller.signal).catch((err: unknown) => ({
          kind: "unchecked" as const,
          reason: getErrorMessage(err),
        }));
        if (controller.signal.aborted) return;
        fetchLogger.log("Tap preflight", {
          target: key,
          result: value.kind,
          ms: Math.round(performance.now() - started),
        });
        // "Couldn't look" and an answer missing a lead it couldn't read may
        // both change a moment later; only a final answer is kept.
        if (value.kind !== "unchecked" && !("incomplete" in value)) answers.set(key, value);
        setAnswer({ key, value });
      },
      pasted ? 0 : DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Runs per target, not per keystroke: `key` describes `target` fully, and
    // `text` only decides the delay.
  }, [key]);

  // After the check above, so it compares against the previous render's text.
  useEffect(() => {
    previousText.current = text;
  });

  if (!key) return undefined;
  return answers.get(key) ?? (answer?.key === key ? answer.value : "checking");
}

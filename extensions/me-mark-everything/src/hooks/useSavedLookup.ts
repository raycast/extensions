/** Debounced duplicate checks; submission always checks the library again. */
import { useEffect, useRef, useState } from "react";
import { Failure } from "../helper";
import { findSaved, lookupKey, type SavedHit } from "../helpers/duplicates";
import { session } from "../session";

export type SavedLookup = { key: string; links: string[]; hits: SavedHit[] };

const PAUSE = 320;

export function useSavedLookup(input: string[], enabled: boolean) {
  const [lookup, setLookup] = useState<SavedLookup>();
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const checked = useRef("");
  const inputKey = JSON.stringify(input);

  useEffect(() => {
    if (!enabled) return;
    const target = lookupKey(JSON.parse(inputKey) as string[]);
    setError(undefined);
    if (!target || target.key === checked.current) return;

    let stopped = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const active = await session();
          const hits = await findSaved(active, target.links, controller.signal);
          if (stopped) return;
          checked.current = target.key;
          setError(undefined);
          setLookup({ key: target.key, links: target.links, hits });
        } catch (cause) {
          if (stopped || (cause instanceof Failure && cause.code === "CANCELLED")) return;
          setError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      })();
    }, PAUSE);

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputKey, enabled, attempt]);

  return {
    // A stale answer for an input the user already replaced must not drive the
    // banner: only the result that matches what is in the field now is returned.
    lookup: lookup && lookup.key === (lookupKey(input)?.key ?? "") ? lookup : undefined,
    error,
    /** Re-check after a write, so the banner reflects what is stored now. */
    reload: () => {
      checked.current = "";
      setAttempt((n) => n + 1);
    },
  };
}

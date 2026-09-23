import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { calculateCorrectedText } from "../utils/text-correction";
import type { AppliedCorrections, CheckTextResponse } from "../types";

type StoredChoices = {
  /** Which response these choices belong to */
  signature: string;
  /** Index of the match, and the replacement chosen for it; null means keep */
  entries: [number, string | null][];
};

const EMPTY: StoredChoices = { signature: "", entries: [] };

/**
 * A cheap, stable hash. Not a checksum: it only has to make two different
 * strings produce different output often enough to be relied on.
 */
function hashOf(input: string): string {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(36);
}

/**
 * Identifies a response, so choices made against an older one are dropped.
 *
 * The text itself is part of it, not just its length: two different sentences
 * of the same length flagged in the same places would otherwise look like the
 * same response, and the previous run's choices would be applied to words they
 * were never made for.
 */
function signatureOf(textChecked: string, result: CheckTextResponse): string {
  const matches = result.matches ?? [];
  const shape = matches
    .map(
      (match) =>
        `${match.offset}.${match.length}.${match.replacements[0]?.value ?? ""}`,
    )
    .join("|");
  return `${hashOf(textChecked)}.${textChecked.length}:${hashOf(shape)}.${matches.length}`;
}

/**
 * Tracks which replacement is used for each match, with every match corrected
 * by default.
 *
 * Only the choices that differ from the default are stored, and null means
 * "keep the original". Deriving the default rather than seeding it into state
 * is what keeps the form controls stable: a control whose value never changes
 * after mount cannot echo an outdated value back at us.
 *
 * The state is cached rather than local because the corrections screen is
 * pushed onto the navigation stack: a pushed view keeps the props it was
 * created with, so plain state in the caller would never reach it. A cached
 * key is shared by every component that reads it, in either direction.
 */
export function useCorrectionChoices(
  textChecked: string,
  result: CheckTextResponse,
  options: { resetOnMount?: boolean } = {},
) {
  const matches = useMemo(() => result.matches ?? [], [result]);
  const signature = signatureOf(textChecked, result);

  const [stored, setStored] = useCachedState<StoredChoices>(
    "correction-choices",
    EMPTY,
  );

  // The cache outlives the command, so the screen that starts a run clears it:
  // otherwise checking the same text again would come back with the previous
  // run's choices already applied, and every run has to start from scratch.
  //
  // Clearing can only happen in an effect, which is one render too late, so
  // until it has run the stored choices are treated as absent. Ignoring them
  // for one frame is what stops the old run from showing through.
  const [cleared, setCleared] = useState(!options.resetOnMount);
  useEffect(() => {
    if (cleared) return;
    setStored(EMPTY);
    setCleared(true);
  }, [cleared, setStored]);

  // Choices made against a previous response no longer line up with these
  // matches, so they are ignored rather than misapplied
  const choices = useMemo(
    () =>
      new Map<number, string | null>(
        cleared && stored.signature === signature ? stored.entries : [],
      ),
    [cleared, stored, signature],
  );

  const chosenFor = useCallback(
    (index: number): string | null => {
      if (choices.has(index)) return choices.get(index) ?? null;
      return matches[index]?.replacements[0]?.value ?? null;
    },
    [choices, matches],
  );

  const applied: AppliedCorrections = useMemo(() => {
    const map = new Map<number, string>();
    matches.forEach((match, index) => {
      const chosen = choices.has(index)
        ? (choices.get(index) ?? null)
        : (match.replacements[0]?.value ?? null);
      if (chosen !== null) map.set(index, chosen);
    });
    return map;
  }, [matches, choices]);

  const correctedText = useMemo(
    () => calculateCorrectedText(textChecked, result, applied),
    [textChecked, result, applied],
  );

  const write = useCallback(
    (next: Map<number, string | null>) =>
      setStored({ signature, entries: Array.from(next.entries()) }),
    [setStored, signature],
  );

  const setChoice = useCallback(
    (index: number, value: string | null) => {
      const next = new Map(choices);
      next.set(index, value);
      write(next);
    },
    [choices, write],
  );

  const toggleChoice = useCallback(
    (index: number) => {
      const match = matches[index];
      if (!match) return;

      const fallback = match.replacements[0]?.value ?? null;
      const current = choices.has(index)
        ? (choices.get(index) ?? null)
        : fallback;

      const next = new Map(choices);
      next.set(index, current === null ? fallback : null);
      write(next);
    },
    [choices, matches, write],
  );

  return {
    matches,
    applied,
    correctedText,
    chosenFor,
    setChoice,
    toggleChoice,
  };
}

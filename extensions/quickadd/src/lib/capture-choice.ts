import type { ChoiceSummary } from "./types";

/**
 * The capture preference stores a name, but QuickAdd runs choices by id and
 * two choices in different Multi folders can share a name.
 */
export function resolveCaptureChoice(
  choices: ChoiceSummary[],
  name: string,
): ChoiceSummary {
  const wanted = name.trim();
  const named = choices.filter((c) => c.runnable && c.name === wanted);
  if (named.length === 1) return named[0];
  if (named.length === 0) {
    throw new Error(`No QuickAdd choice is named "${wanted}".`);
  }
  const captures = named.filter((c) => c.type === "Capture");
  if (captures.length === 1) return captures[0];
  throw new Error(
    `Several QuickAdd choices are named "${wanted}". Rename one of them.`,
  );
}

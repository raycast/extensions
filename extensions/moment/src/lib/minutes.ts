// Pure: no @raycast import, so `node --test` loads it.

/** The timer's maximum, as Moment and Siri hold it. */
export const MAXIMUM_MINUTES = 90;

/** What Add Time adds without minutes: Moment's "Another 5 minutes" step (ScriptTimerCommands.defaultMinutesToAdd). */
export const MINUTES_ADDED_BY_DEFAULT = 5;

export const NOT_WHOLE_MINUTES = "Moment takes whole minutes from 1 to 90.";
/** Siri's line (VoiceTimerDialog.reachedTheMaximum). */
export const OVER_THE_MAXIMUM = "The timer can run for 90 minutes at most.";

export type MinutesArgument = { ok: true; minutes: number | undefined } | { ok: false; title: string };

/**
 * A command's optional minutes argument, as the person typed it: empty is
 * "not given"; otherwise a whole number from 1 to 90, or it is refused before
 * Moment is asked.
 */
export function parseMinutes(text: string | undefined): MinutesArgument {
  const trimmed = (text ?? "").trim();
  if (trimmed === "") return { ok: true, minutes: undefined };
  if (!/^\d+$/.test(trimmed)) return { ok: false, title: NOT_WHOLE_MINUTES };
  const minutes = Number(trimmed);
  if (minutes > MAXIMUM_MINUTES) return { ok: false, title: OVER_THE_MAXIMUM };
  if (minutes < 1) return { ok: false, title: NOT_WHOLE_MINUTES };
  return { ok: true, minutes };
}

/**
 * A tool's optional minutes, as the model sends them: a number, or nothing
 * (null too). A numeric string is read as the person would have typed it.
 */
export function toolMinutes(value: unknown): MinutesArgument {
  if (value === undefined || value === null) return { ok: true, minutes: undefined };
  if (typeof value === "string") return parseMinutes(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    return { ok: false, title: NOT_WHOLE_MINUTES };
  if (value > MAXIMUM_MINUTES) return { ok: false, title: OVER_THE_MAXIMUM };
  return { ok: true, minutes: value };
}

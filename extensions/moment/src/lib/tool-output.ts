// Pure: no @raycast import, so `node --test` loads it.
//
// Everything a tool hands Raycast AI, and through it the AI provider: the
// timer in flight and nothing else (FF-1148's boundary). No intention, Stats,
// feelings, recap or history; Moment's record doesn't carry them either.

import type { Failure } from "./lines.ts";
import type { TimerInfo, TimerKind, TimerState } from "./timer.ts";

/** A tool's result. `capped` stays out: the AI sees the cap in `durationSeconds`. */
export type ToolTimer = {
  state: TimerState;
  kind: TimerKind;
  timeLeftSeconds: number;
  durationSeconds: number;
};

/** Built field by field, so nothing else on the record can pass through. */
export function toolOutput(timer: TimerInfo): ToolTimer {
  return {
    state: timer.state,
    kind: timer.kind,
    timeLeftSeconds: timer.timeLeftSeconds,
    durationSeconds: timer.durationSeconds,
  };
}

/** A refusal, as the error a tool throws: the toast's lines, one sentence after the other. */
export function toolErrorText(failure: Failure): string {
  return failure.message ? `${failure.title} ${failure.message}` : failure.title;
}

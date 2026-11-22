import type { Reason, State } from "./engine";
import { formatMinutes } from "./engine";

export interface Phase {
  label: string;
  seconds: number;
  scale: number;
}

export interface Pattern {
  title: string;
  subtitle: string;
  phases: Phase[];
  cycles: number;
}

const SIGH: Phase[] = [
  { label: "Breathe in", seconds: 2.5, scale: 0.8 },
  { label: "A little more", seconds: 1.2, scale: 1 },
  { label: "Long breath out", seconds: 6.5, scale: 0.35 },
];

const BOX: Phase[] = [
  { label: "Breathe in", seconds: 4, scale: 1 },
  { label: "Hold", seconds: 4, scale: 1 },
  { label: "Breathe out", seconds: 4, scale: 0.35 },
  { label: "Hold", seconds: 4, scale: 0.35 },
];

const RESONANT: Phase[] = [
  { label: "Breathe in", seconds: 4, scale: 1 },
  { label: "Breathe out", seconds: 6, scale: 0.35 },
];

/** Picks the breathing technique for the moment: a sigh after calls, box after focus, slow exhales when scattered. */
export function patternFor(reason: Reason, state: State, focusMin: number): Pattern {
  switch (reason) {
    case "post-call":
      return {
        title: state.lastCall ? `That call took ${formatMinutes(state.lastCall.minutes)}` : "Call's over",
        subtitle: "Three slow sighs to leave it behind before the next thing.",
        phases: SIGH,
        cycles: 3,
      };
    case "long-focus":
      return {
        title: focusMin > 0 ? `${formatMinutes(focusMin)} of deep work` : "You've been at it a while",
        subtitle: "One minute of box breathing, then dive back in.",
        phases: BOX,
        cycles: 4,
      };
    case "scattered":
      return {
        title: "Lots of switching lately",
        subtitle: "Five long exhales to settle your attention.",
        phases: RESONANT,
        cycles: 5,
      };
    default:
      return {
        title: "Take a breath",
        subtitle: "Six slow breaths. Longer out than in.",
        phases: RESONANT,
        cycles: 6,
      };
  }
}

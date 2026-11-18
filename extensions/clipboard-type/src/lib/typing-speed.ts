/** Delays in seconds. */
export interface TypingSpeed {
  /** How long each key (and Shift, before and after the key) is held. */
  keyHold: number;
  /** Average pause after each keystroke. */
  gap: number;
  /** How far each pause may randomly stray from `gap`, as a fraction of it (0 for a fixed pause). */
  gapVariance: number;
}

const humanCadenceVariance = 0.5;

// The Typing Speed titles in package.json show measured time per key. Re-measure and update them when changing these.
// Average and slower keep the 50 ms key hold that browser-based remote consoles need to register keys and Shift.
const typingSpeeds: Record<Preferences["humanCadenceSpeed"], Pick<TypingSpeed, "keyHold" | "gap">> = {
  "very-slow": { keyHold: 0.05, gap: 0.2 },
  slow: { keyHold: 0.05, gap: 0.1 },
  average: { keyHold: 0.05, gap: 0.06 },
  fast: { keyHold: 0.01, gap: 0.03 },
  "very-fast": { keyHold: 0.005, gap: 0.0125 },
  "super-human": { keyHold: 0.002, gap: 0 },
};

// The speed preference keeps its original `humanCadenceSpeed` name so users' saved speed carries over.
export function getTypingSpeed({ humanCadence, humanCadenceSpeed }: Preferences): TypingSpeed {
  return { ...typingSpeeds[humanCadenceSpeed], gapVariance: humanCadence ? humanCadenceVariance : 0 };
}

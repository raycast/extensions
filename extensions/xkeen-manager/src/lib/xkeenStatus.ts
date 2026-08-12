// === Types ===

export type XkeenStatus = {
  isRunning: boolean;
  isStopped: boolean;
  mode: string;
};

// === Regexes ===
// Kept in one place so status parsing stays consistent between the main
// view command and the menu bar command.

const STOPPED_RE = /не запущен|stopped|not running/i;
const RUNNING_RE = /запущен|running/i;
const MODE_RE = /(?:режиме|mode)[\s\W]*([a-zA-Z0-9_-]+)/i;

// === Functions ===

export function parseXkeenStatus(statusRaw: string): XkeenStatus {
  const isStopped = STOPPED_RE.test(statusRaw);
  const isRunning = !isStopped && RUNNING_RE.test(statusRaw);
  const modeMatch = statusRaw.match(MODE_RE);
  const mode = modeMatch ? modeMatch[1] : "Unknown";
  return { isRunning, isStopped, mode };
}

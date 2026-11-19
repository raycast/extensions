import { SleepBlocker } from "../types";

// The process name may itself contain parentheses, e.g. "Code Helper (Renderer)".
const LINE = /^\s+pid (\d+)\((.+?)\): \[(0x[0-9a-f]+)\] (\d+):(\d{2}):(\d{2}) (\w+) named: "(.*)"\s*$/;
// Follows its assertion on a line of its own.
const TIMEOUT = /^\s+Timeout will fire in (\d+) secs/;

const KIND: Record<string, SleepBlocker["kind"]> = {
  PreventUserIdleSystemSleep: "system",
  PreventSystemSleep: "system",
  NoIdleSleepAssertion: "system",
  PreventUserIdleDisplaySleep: "display",
  NoDisplaySleepAssertion: "display",
};

// powerd always holds "Prevent sleep while display is on" while the screen is on; it is not a culprit.
const IGNORED_PROCESSES = new Set(["powerd"]);

// Timed assertions that last about a minute in total (held so far plus time left) are system chatter,
// e.g. useractivityd's Bluetooth advertising. caffeinate -t 300 is timed too, but lasts five minutes.
const SHORT_LIVED_SEC = 60;

export function parseAssertions(text: string): SleepBlocker[] {
  const blockers: SleepBlocker[] = [];
  let last: SleepBlocker | undefined;
  for (const line of text.split("\n")) {
    const timeout = TIMEOUT.exec(line);
    if (timeout && last && last.heldSec + Number(timeout[1]) <= SHORT_LIVED_SEC) {
      blockers.splice(blockers.indexOf(last), 1);
      last = undefined;
      continue;
    }
    const m = LINE.exec(line);
    if (!m) continue;
    last = undefined;
    const [, pid, proc, id, h, min, s, assertion, name] = m;
    const kind = KIND[assertion];
    if (!kind || IGNORED_PROCESSES.has(proc)) continue;
    last = {
      id,
      pid: Number(pid),
      process: proc,
      kind,
      assertion,
      heldSec: Number(h) * 3600 + Number(min) * 60 + Number(s),
      name,
    };
    blockers.push(last);
  }
  return blockers;
}

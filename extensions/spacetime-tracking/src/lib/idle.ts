import { execSync } from "child_process";

/**
 * Returns the number of seconds since the last user input (keyboard/mouse),
 * read from the macOS IOHIDSystem. Returns 0 if it cannot be determined.
 */
export function getIdleSeconds(): number {
  try {
    // `-r -d 1` keeps the output tiny (~a few dozen lines) since this runs on every tick.
    const out = execSync("/usr/sbin/ioreg -c IOHIDSystem -r -d 1", { timeout: 4000, encoding: "utf8" });
    const match = out.match(/"HIDIdleTime"\s*=\s*(\d+)/);
    if (!match) return 0;
    // HIDIdleTime is reported in nanoseconds.
    return Number(match[1]) / 1_000_000_000;
  } catch {
    return 0;
  }
}

/**
 * True when an app is holding a "prevent display sleep" power assertion — i.e. deliberately keeping
 * the screen awake, as video players, browsers playing video, video calls, and presentation apps do
 * while active. Lets us avoid auto-pausing when the user is watching something (no keyboard/mouse
 * input, but clearly still present). Only called when we're already about to pause, so the extra
 * `pmset` call doesn't run every tick.
 */
export function isDisplayKeptAwake(): boolean {
  try {
    const out = execSync("/usr/bin/pmset -g assertions", { timeout: 4000, encoding: "utf8" });
    const match = out.match(/PreventUserIdleDisplaySleep\s+(\d+)/);
    return !!match && Number(match[1]) > 0;
  } catch {
    return false;
  }
}

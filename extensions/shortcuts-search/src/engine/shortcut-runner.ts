import { runWindowsShortcuts, validateWindowsSequence } from "./windows-shortcut-runner";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AtomicShortcut } from "../model/internal/internal-models";
import type { KeyCodes } from "../load/key-codes-provider";
import { getPlatform } from "../load/platform";
import {
  chromiumBundles,
  safariBundles,
  parseDelay,
  validateTarget,
  type ExecutionTarget,
  type MacExecutionTarget,
} from "./execution-target";
const execute = promisify(execFile);
const allowedModifiers = new Set(["command down", "control down", "option down", "shift down"]);
export function validateSequence(sequence: AtomicShortcut[], keyCodes: KeyCodes) {
  if (getPlatform() === "windows") return validateWindowsSequence(sequence);
  if (sequence.length === 0 || sequence.length > 32) throw new Error("Shortcut has no executable key sequence");
  return sequence.map((atomic) => {
    const raw = keyCodes[atomic.base];
    if (
      !raw ||
      !/^\d+$/.test(raw) ||
      Number(raw) > 127 ||
      atomic.modifiers.some((modifier) => !allowedModifiers.has(modifier))
    )
      throw new Error("Shortcut contains an unsupported key or modifier");
    return { keyCode: Number(raw), modifiers: atomic.modifiers };
  });
}
export function buildJxaScript(
  target: MacExecutionTarget,
  delaySeconds: number,
  sequence: AtomicShortcut[],
  keyCodes: KeyCodes
): string {
  validateTarget(target);
  const wait = parseDelay(delaySeconds);
  const chords = validateSequence(sequence, keyCodes);
  return `(function() {
    const target = ${JSON.stringify(target)};
    const chords = ${JSON.stringify(chords)};
    const events = Application("System Events");
    const targetApp = Application(target.bundleId);
    targetApp.activate();
    // Activation/launch is asynchronous. Wait for the requested app once,
    // without sending any keys or retrying a failed chord.
    let activated = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const front = events.applicationProcesses.whose({ frontmost: true });
      if (front.length && front[0].bundleIdentifier() === target.bundleId) { activated = true; break; }
      delay(0.05);
    }
    if (!activated) throw new Error("Application did not become ready; no keys were sent");
    delay(${wait});
    function verify() {
      const front = events.applicationProcesses.whose({ frontmost: true });
      if (!front.length || front[0].bundleIdentifier() !== target.bundleId) throw new Error("Application focus changed; remaining keys were cancelled");
      if (target.kind === "browser") {
        let url;
        if (${JSON.stringify(safariBundles)}.indexOf(target.bundleId) >= 0) url = targetApp.documents[0].url();
        else if (${JSON.stringify(chromiumBundles)}.indexOf(target.bundleId) >= 0) url = targetApp.windows[0].activeTab().url();
        else url = targetApp.windows[0].activeTab.url();
        if (url !== target.url) throw new Error("Web page changed; remaining keys were cancelled");
      }
    }
    for (let index = 0; index < chords.length; index++) {
      verify();
      try { events.keyCode(chords[index].keyCode, { using: chords[index].modifiers }); }
      catch (error) { throw new Error("Could not send chord " + (index + 1) + "; earlier chords may have run. Check Accessibility and Automation permissions."); }
    }
  })();`;
}
export async function runShortcuts(
  target: ExecutionTarget,
  delaySeconds: number,
  sequence: AtomicShortcut[],
  keyCodes: KeyCodes
): Promise<void> {
  if (getPlatform() === "windows") {
    if (!("windowsProcessName" in target)) throw new Error("Windows application target is unavailable");
    return runWindowsShortcuts(target, delaySeconds, sequence);
  }
  if (!("bundleId" in target)) throw new Error("macOS application target is unavailable");
  const script = buildJxaScript(target, delaySeconds, sequence, keyCodes);
  try {
    await execute("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], { timeout: 15000, maxBuffer: 65536 });
  } catch {
    throw new Error(
      "Shortcut execution stopped. Check the target and Accessibility/Automation permissions. Earlier chords may have run; retry manually."
    );
  }
}

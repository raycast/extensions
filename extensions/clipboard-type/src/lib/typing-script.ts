import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { environment } from "@raycast/api";
import { shiftKeyCode } from "./keymap";
import { detectMissingPermission, type Permission, PermissionError } from "./permissions";
import type { Keystroke } from "./keystrokes";
import { createLineSplitter, messagePrefix, parseScriptLine } from "./script-output";
import type { TypingSpeed } from "./typing-speed";

const forceStopTimeoutMs = 2000;

/** Input for `assets/type-keystrokes.js`. Delays are in seconds. */
export interface TypingPayload extends TypingSpeed {
  keystrokes: Keystroke[];
  initialDelay: number;
}

interface ScriptPayload extends TypingPayload {
  shiftKeyCode: number;
  messagePrefix: string;
  stopFile: string;
}

export type StopReason = "escape" | "button" | "app-switch";

export interface TypingResult {
  /** Why typing stopped early, or null if every keystroke was typed. */
  stopReason: StopReason | null;
  remaining: number;
}

export interface TypingSession {
  result: Promise<TypingResult>;
  /** Asks the script to stop after the current keystroke. Only the first reason is kept. */
  stop(reason: StopReason): void;
}

/** Starts the typing script, reporting the number of keystrokes remaining after each one. */
export function startTyping(payload: TypingPayload, onProgress?: (remaining: number) => void): TypingSession {
  // The script polls for this file instead of being killed, so it never exits with a key held down.
  const stopDirectory = mkdtempSync(path.join(tmpdir(), "clipboard-type-"));
  const stopFile = path.join(stopDirectory, "stop");
  const scriptPayload: ScriptPayload = { ...payload, shiftKeyCode, messagePrefix, stopFile };

  // The payload goes over stdin rather than argv so clipboard text isn't visible in `ps` output.
  const child = spawn("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    path.join(environment.assetsPath, "type-keystrokes.js"),
  ]);

  let remaining = payload.keystrokes.length;
  let stopReason: StopReason | null = null;
  let forceStopTimer: ReturnType<typeof setTimeout> | undefined;
  let missingPermission: Permission | null = null;

  const result = new Promise<TypingResult>((resolve, reject) => {
    let errorOutput = "";

    // JXA's console.log writes to stderr, so script messages and errors share the stream.
    const stderrLines = createLineSplitter((line) => {
      const message = parseScriptLine(line);
      if (message?.type === "output") {
        errorOutput += `${message.line}\n`;
      } else if (message?.type === "progress") {
        remaining = message.remaining;
        onProgress?.(remaining);
      } else if (message?.type === "stopped") {
        stopReason ??= message.reason;
      } else if (message?.type === "missing-permission") {
        missingPermission = message.permission;
      }
    });

    child.stderr.on("data", (chunk: Buffer) => stderrLines.push(chunk.toString()));

    // If osascript exits before reading the whole payload, the write fails with EPIPE on stdin, not on the child.
    // Without a listener that error would crash the command, so record it and report it from the close handler.
    let stdinError: Error | undefined;
    child.stdin.on("error", (error) => (stdinError = error));

    child.on("error", reject);
    child.on("close", (exitCode) => {
      clearTimeout(forceStopTimer);
      rmSync(stopDirectory, { recursive: true, force: true });
      stderrLines.flush();

      missingPermission ??= detectMissingPermission(errorOutput);
      if (missingPermission) {
        reject(new PermissionError(missingPermission));
      } else if ((exitCode === 0 && !stdinError) || stopReason) {
        resolve({ stopReason, remaining });
      } else {
        reject(new Error(errorOutput.trim() || stdinError?.message || `osascript exited with code ${exitCode}`));
      }
    });

    child.stdin.end(JSON.stringify(scriptPayload));
  });

  return {
    result,
    stop(reason) {
      if (stopReason) return;
      stopReason = reason;
      try {
        writeFileSync(stopFile, "");
      } catch {
        child.kill();
      }
      forceStopTimer = setTimeout(() => child.kill(), forceStopTimeoutMs);
    },
  };
}

/** Releases Shift in case the typing script was interrupted while holding it. */
export async function releaseShift() {
  await startTyping({ keystrokes: [], keyHold: 0, gap: 0, gapVariance: 0, initialDelay: 0 }).result;
}

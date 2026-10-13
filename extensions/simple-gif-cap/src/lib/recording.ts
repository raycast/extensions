import { closeMainWindow, environment, LocalStorage, showHUD } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  HELPER_PROCESS_MARKER,
  pickTarget as nativePick,
  PickResult,
  screenUnderMouse,
  startRecording as nativeStart,
} from "./native";
import { prefs } from "./prefs";

const run = promisify(execFile);
const STATE_KEY = "recording";

export type Target = "region" | "window" | "screen";

interface ActiveRecording {
  pid: number;
  moviePath: string;
  startedAt: number;
}

/** What the preview command receives through the deeplink the helper opens. */
export interface PreviewContext {
  moviePath: string;
  createdAt: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function isHelperRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  // Guard against a reused pid: only signal a process that is still our helper.
  const { stdout } = await run("/bin/ps", ["-p", String(pid), "-o", "comm="]).catch(() => ({ stdout: "" }));

  return stdout.includes(HELPER_PROCESS_MARKER);
}

async function activeRecording(): Promise<ActiveRecording | undefined> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) {
    return undefined;
  }

  const recording = JSON.parse(raw) as ActiveRecording;
  if (await isHelperRunning(recording.pid)) {
    return recording;
  }

  await LocalStorage.removeItem(STATE_KEY);

  return undefined;
}

export function recordingsDir(): string {
  return join(environment.supportPath, "recordings");
}

/** The video the running recording writes to, if one is running. */
export async function activeMoviePath(): Promise<string | undefined> {
  return (await activeRecording())?.moviePath;
}

async function pickTarget(target: Target): Promise<PickResult | null> {
  if (target === "screen") {
    return { kind: "region", rect: await screenUnderMouse() };
  }

  // null: the user pressed Escape.
  return nativePick(target);
}

function timestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return `${day} at ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
}

async function startRecording(target: Target) {
  const picked = await pickTarget(target);
  if (!picked) {
    return;
  }

  await mkdir(recordingsDir(), { recursive: true });
  const now = new Date();
  const moviePath = join(recordingsDir(), `GIF ${timestamp(now)}.mov`);
  const context: PreviewContext = { moviePath, createdAt: now.getTime() };
  const { countdown, maxDuration, showClicks, showCursor } = prefs();

  let pid: number;
  try {
    pid = await nativeStart({
      rect: picked.rect,
      windowId: picked.kind === "window" ? (picked.id ?? null) : null,
      output: moviePath,
      countdown: Number(countdown),
      maxSeconds: Number(maxDuration),
      showClicks,
      showCursor,
      doneURL: createDeeplink({ command: "preview", context }),
    });
  } catch {
    await showHUD("Could not start the recorder");

    return;
  }

  await LocalStorage.setItem(STATE_KEY, JSON.stringify({ pid, moviePath, startedAt: now.getTime() }));
}

/** Asks the helper to stop. It saves the video and opens the preview itself. */
export async function stopRecording(): Promise<boolean> {
  const recording = await activeRecording();
  if (!recording) {
    return false;
  }

  process.kill(recording.pid, "SIGINT");
  await LocalStorage.removeItem(STATE_KEY);

  return true;
}

/** Every record command doubles as the stop command, so one hotkey is enough. */
export async function toggleRecording(target: Target) {
  await closeMainWindow({ clearRootSearch: true });
  if (await stopRecording()) {
    return;
  }

  // Let the previous app become frontmost again before the picker opens.
  await sleep(150);
  await startRecording(target);
}

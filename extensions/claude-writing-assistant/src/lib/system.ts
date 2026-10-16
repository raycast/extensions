import { ChildProcess, execFile, spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ImageType } from "./conversations";
import { dataPath } from "./store";

const run = promisify(execFile);

export interface Capture {
  path: string;
  mediaType: ImageType;
}

/** Longest edge sent to Claude: sharp enough for small UI text, cheap in tokens. */
const MAX_EDGE = 2000;
const MAX_BYTES = 3_500_000;

async function dimensions(file: string): Promise<{ width: number; height: number }> {
  const { stdout } = await run("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
  const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0);
  return { width, height };
}

/**
 * Interactive region capture (Space switches to window capture, Esc cancels → null).
 * `keep` stores the image with the extension data so a conversation can refer to it later.
 */
export async function captureRegion(keep: boolean): Promise<Capture | null> {
  const dir = keep ? dataPath("images") : os.tmpdir();
  await fs.mkdir(dir, { recursive: true });
  const png = path.join(dir, `screen-${Date.now()}.png`);
  await run("/usr/sbin/screencapture", ["-i", "-x", "-o", png]).catch(() => undefined);
  try {
    await fs.access(png);
  } catch {
    return null;
  }

  const { width, height } = await dimensions(png).catch(() => ({ width: 0, height: 0 }));
  if (Math.max(width, height) > MAX_EDGE) {
    await run("/usr/bin/sips", ["-Z", String(MAX_EDGE), png]).catch(() => undefined);
  }
  // Photos and video frames compress badly as PNG; JPEG keeps them under the upload limit.
  if ((await fs.stat(png)).size > MAX_BYTES) {
    const jpg = png.replace(/\.png$/, ".jpg");
    await run("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", png, "--out", jpg]);
    await fs.rm(png, { force: true });
    return { path: jpg, mediaType: "image/jpeg" };
  }
  return { path: png, mediaType: "image/png" };
}

// ---------------------------------------------------------------------------------------------
// Text to speech
// ---------------------------------------------------------------------------------------------

interface Voice {
  name: string;
  locale: string;
}

let voices: Promise<Voice[]> | undefined;
let speaking: ChildProcess | undefined;

function listVoices(): Promise<Voice[]> {
  voices ??= run("/usr/bin/say", ["-v", "?"])
    .then(({ stdout }) =>
      stdout.split("\n").flatMap((line) => {
        const match = line.match(/^(.+?)\s{2,}([a-z]{2,3}_[A-Z0-9]{2,3})\s+#/);
        return match ? [{ name: match[1].trim(), locale: match[2] }] : [];
      }),
    )
    .catch(() => []);
  return voices;
}

export function isSpeaking(): boolean {
  return !!speaking && speaking.exitCode === null && !speaking.killed;
}

export function stopSpeaking(): void {
  if (isSpeaking()) speaking?.kill();
  speaking = undefined;
}

/** Reads text aloud with a voice for `languageCode` when one is installed. */
export async function speak(text: string, languageCode?: string): Promise<void> {
  stopSpeaking();
  const voice = languageCode ? (await listVoices()).find((v) => v.locale.startsWith(`${languageCode}_`)) : undefined;
  const file = path.join(os.tmpdir(), `claude-say-${Date.now()}.txt`);
  await fs.writeFile(file, text, "utf8");
  const child = spawn("/usr/bin/say", [...(voice ? ["-v", voice.name] : []), "-f", file], {
    detached: true,
    stdio: "ignore",
  });
  child.on("exit", () => fs.rm(file, { force: true }).catch(() => undefined));
  child.unref();
  speaking = child;
}

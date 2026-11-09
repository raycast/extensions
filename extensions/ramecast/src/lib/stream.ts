import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import { execFileSync, spawn } from "child_process";
import { randomBytes } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { ensureFfmpeg } from "./ffmpeg";
import { adapterFor, Device } from "./protocols";
import { CAST_LOG, protocolLog } from "./protocols/log";

const STATE_KEY = "active-cast";
const HLS_DIR = path.join(environment.supportPath, "hls");
const LOG_FILE = path.join(environment.supportPath, "ffmpeg.log");
const MIRROR_STATUS = path.join(environment.supportPath, "mirror-status.json");

/** Thrown when macOS isn't delivering screen frames (Screen Recording permission missing). */
export class ScreenPermissionError extends Error {}

/** Latency preference: the receiver's playout buffer and the capture frame rate. */
const LATENCY = {
  auto: { targetDelayMs: 200, fps: 30, auto: true },
  lowest: { targetDelayMs: 100, fps: 60, auto: false },
  balanced: { targetDelayMs: 200, fps: 30, auto: false },
  smooth: { targetDelayMs: 400, fps: 30, auto: false },
} as const;

function latencySettings() {
  const { latency } = getPreferenceValues<{ latency?: keyof typeof LATENCY }>();
  return LATENCY[latency ?? "auto"] ?? LATENCY.auto;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function noFramesError(): Error {
  // ffmpeg is running but never started encoding: on macOS this means no screen frames (Screen Recording).
  if (process.platform === "darwin" && !logIncludes("Output #0")) {
    return new ScreenPermissionError(
      "No screen frames received. Allow Raycast under Screen Recording, then quit and reopen Raycast.",
    );
  }
  return new Error(`Screen capture produced no output: ${ffmpegFailure()}`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill the streamer and everything it spawned (ffmpeg). */
function killTree(pid: number) {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL"); // the detached streamer leads its own process group
  } catch {
    // already gone
  }
}

function logIncludes(text: string): boolean {
  try {
    return fs.readFileSync(LOG_FILE, "utf8").includes(text);
  } catch {
    return false;
  }
}

/** The most relevant lines of ffmpeg's log, for error messages. */
function ffmpegFailure(): string {
  let lines: string[] = [];
  try {
    lines = fs
      .readFileSync(LOG_FILE, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return "ffmpeg did not start";
  }
  const errors = lines.filter((l) => /error|denied|not permitted|failed|invalid|unable|cannot|could not/i.test(l));
  return (errors.length ? errors : lines).slice(-2).join(" — ") || "ffmpeg produced no output";
}

interface ActiveCast {
  pid: number;
  device: Device;
}

/** The local IPv4 address on the same subnet as the device (falls back to the first external one). */
export function localIp(deviceHost: string): string {
  const toInt = (ip: string) => ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
  const all = Object.values(os.networkInterfaces())
    .flat()
    .filter((a): a is os.NetworkInterfaceInfo => !!a && a.family === "IPv4" && !a.internal);
  const same = all.find((a) => ((toInt(a.address) ^ toInt(deviceHost)) & toInt(a.netmask)) === 0);
  const hit = same ?? all[0];
  if (!hit) throw new Error("Could not determine local network address.");
  return hit.address;
}

function captureArgs(ffmpeg: string, fps: number): string[] {
  if (process.platform === "win32") return ["-f", "gdigrab", "-framerate", String(fps), "-i", "desktop"];
  // macOS: find the "Capture screen 0" avfoundation index (cameras are listed first).
  let listing = "";
  try {
    execFileSync(ffmpeg, ["-f", "avfoundation", "-list_devices", "true", "-i", ""], { stdio: "pipe" });
  } catch (e) {
    listing = String((e as { stderr?: Buffer }).stderr ?? "");
  }
  const m = listing.match(/\[(\d+)\] Capture screen 0/);
  if (!m) throw new Error("Could not find a screen capture device. Grant Raycast Screen Recording permission.");
  // The screen input may ignore -framerate and report a 1,000,000 fps timebase; the fps filter below fixes that.
  return [
    "-f",
    "avfoundation",
    "-framerate",
    String(fps),
    "-pixel_format",
    "nv12",
    "-capture_cursor",
    "1",
    "-i",
    `${m[1]}:none`,
  ];
}

function spawnDetached(script: string, args: string[]): number {
  const child = spawn(process.execPath, [path.join(environment.assetsPath, script), ...args], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child.pid ?? 0;
}

export async function startCast(device: Device, onProgress?: (message: string) => void): Promise<void> {
  await stopCast();
  const ffmpeg = await ensureFfmpeg(onProgress);
  const bindIp = localIp(device.host);

  if (device.protocol === "googlecast") {
    onProgress?.("Starting screen mirroring…");
    const latency = latencySettings();
    const unavailable = await startMirror(device, ffmpeg, captureArgs(ffmpeg, latency.fps), bindIp, latency);
    if (!unavailable) return;
    onProgress?.("Mirroring unavailable on this device, using video stream…");
  } else {
    onProgress?.("Starting stream…");
  }
  await startHls(device, ffmpeg, captureArgs(ffmpeg, 30), bindIp);
}

/**
 * Cast Streaming, the low-latency protocol Chrome uses. Resolves `undefined` once frames are flowing,
 * or a reason string when the device can't mirror (so the caller falls back to HLS). Throws for
 * failures a fallback can't fix (device unreachable, screen capture broken).
 */
async function startMirror(
  device: Device,
  ffmpeg: string,
  capture: string[],
  bindIp: string,
  latency: { targetDelayMs: number; fps: number; auto: boolean },
) {
  protocolLog("mirror")(`mirroring to ${device.name} (${device.host}:${device.port})`);
  fs.rmSync(MIRROR_STATUS, { force: true });
  const config = {
    host: device.host,
    port: device.port,
    bindIp,
    ffmpeg,
    captureArgs: capture,
    castLog: CAST_LOG,
    ffmpegLog: LOG_FILE,
    statusFile: MIRROR_STATUS,
    ...latency,
  };
  const pid = spawnDetached("mirror.js", [JSON.stringify(config)]);
  await LocalStorage.setItem(STATE_KEY, JSON.stringify({ pid, device } satisfies ActiveCast));

  let status: { state: string; stage?: string; message?: string } | undefined;
  for (let i = 0; i < 120 && !status && isAlive(pid); i++) {
    await sleep(500);
    try {
      status = JSON.parse(fs.readFileSync(MIRROR_STATUS, "utf8"));
    } catch {
      // not written yet
    }
  }
  if (status?.state === "streaming") return undefined;

  await stopCast();
  if (!status) throw new Error(isAlive(pid) ? "Mirroring timed out" : "Mirroring stopped unexpectedly (see cast.log)");
  if (status.stage === "launch" || status.stage === "offer") {
    fs.copyFileSync(CAST_LOG, CAST_LOG.replace(/\.log$/, "-mirror.log")); // keep the trace; HLS starts a new one
    return status.message ?? "mirroring unavailable";
  }
  if (status.stage === "capture")
    throw status.message === "no screen frames"
      ? noFramesError()
      : new Error(`Screen capture failed: ${ffmpegFailure()}`);
  throw new Error(status.message ?? "Mirroring failed");
}

/** HLS: the device plays the screen like a live video (DLNA, Roku, and Google Cast fallback). */
async function startHls(device: Device, ffmpeg: string, capture: string[], bindIp: string) {
  fs.rmSync(HLS_DIR, { recursive: true, force: true });
  fs.mkdirSync(HLS_DIR, { recursive: true, mode: 0o700 });
  const token = randomBytes(24).toString("hex");

  const args = [
    "-hide_banner", "-nostats",
    ...capture,
    "-vf", "fps=30,scale=-2:1080,format=yuv420p", "-r", "30",
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-g", "30",
    "-f", "hls", "-hls_time", "1", "-hls_list_size", "4",
    "-hls_flags", "delete_segments+independent_segments",
    path.join(HLS_DIR, "index.m3u8"),
  ]; // prettier-ignore

  const pid = spawnDetached("streamer.js", [
    bindIp,
    device.host,
    token,
    HLS_DIR,
    ffmpeg,
    JSON.stringify(args),
    LOG_FILE,
  ]);
  await LocalStorage.setItem(STATE_KEY, JSON.stringify({ pid, device } satisfies ActiveCast));

  // Wait for the server's port and the first playlist before telling the device to load it.
  const playlist = path.join(HLS_DIR, "index.m3u8");
  const portFile = path.join(HLS_DIR, ".port");
  const ready = () => fs.existsSync(playlist) && fs.existsSync(portFile);
  for (let i = 0; i < 30 && !ready() && isAlive(pid); i++) await sleep(500);
  if (!ready()) {
    const crashed = !isAlive(pid);
    await stopCast();
    throw crashed ? new Error(`Screen capture failed: ${ffmpegFailure()}`) : noFramesError();
  }

  const port = fs.readFileSync(portFile, "utf8").trim();
  const base = `http://${bindIp}:${port}/${token}`;
  try {
    await adapterFor(device.protocol).play(device, { hls: `${base}/index.m3u8`, ts: `${base}/live.ts` });
  } catch (e) {
    await stopCast();
    throw e;
  }
}

export async function stopCast(): Promise<ActiveCast | undefined> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) return undefined;
  const active = JSON.parse(raw) as ActiveCast;
  await LocalStorage.removeItem(STATE_KEY);
  killTree(active.pid);
  try {
    await adapterFor(active.device.protocol ?? "googlecast").stop(active.device);
  } catch {
    // device unreachable; stream is already stopped locally
  }
  return active;
}

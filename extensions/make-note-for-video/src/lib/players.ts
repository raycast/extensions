import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strings } from "./strings";

// Set in IINA: Settings → Advanced → Additional mpv options → input-ipc-server.
const IINA_SOCKET = "/tmp/iina-mpv.sock";
const IINA_BUNDLE = "com.colliderli.iina";
const BROWSERS = ["net.imput.helium", "com.google.Chrome"];

export type Capture = {
  seconds: number;
  // Frame in a temp folder; moved to shots/ only when the note is saved.
  framePath: string;
  recordingUrl?: string;
  resume: () => Promise<void>;
};

export async function capture(): Promise<Capture> {
  removeStaleFrames();
  const front = await getFrontmostApplication();
  if (front.bundleId && BROWSERS.includes(front.bundleId)) return captureBrowser(front.bundleId);
  if (front.bundleId === IINA_BUNDLE || existsSync(IINA_SOCKET)) return captureIina();
  throw new Error(strings.noPlayer);
}

const tempFrame = () => join(tmpdir(), `video-note-${Date.now()}.jpg`);

// A note cancelled with Esc leaves its frame behind; only one note form is open at a time.
function removeStaleFrames() {
  for (const name of readdirSync(tmpdir())) {
    if (/^video-note-\d+\.jpg$/.test(name)) rmSync(join(tmpdir(), name), { force: true });
  }
}

function mpv(command: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(IINA_SOCKET);
    const requestId = Math.floor(Math.random() * 1e9);
    let buffer = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(strings.iinaNoAnswer));
    }, 3000);
    socket.on("connect", () => socket.write(JSON.stringify({ command, request_id: requestId }) + "\n"));
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        // The socket also receives mpv events; skip them.
        if (message.request_id !== requestId) continue;
        clearTimeout(timer);
        socket.end();
        if (message.error === "success") resolve(message.data);
        else reject(new Error(`IINA: ${message.error}`));
      }
    });
    socket.on("error", () => {
      clearTimeout(timer);
      reject(new Error(strings.iinaNoSocket));
    });
  });
}

async function captureIina(): Promise<Capture> {
  const path = await mpv(["get_property", "path"]).catch(() => null);
  if (!path) throw new Error(strings.iinaNoVideo);
  const wasPaused = (await mpv(["get_property", "pause"])) === true;
  const resume = async () => {
    if (!wasPaused) await mpv(["set_property", "pause", false]);
  };
  await mpv(["set_property", "pause", true]);
  try {
    const seconds = Number(await mpv(["get_property", "time-pos"]));
    const framePath = tempFrame();
    await mpv(["screenshot-to-file", framePath, "video"]);
    if (!existsSync(framePath)) throw new Error(strings.iinaNoFrame);
    return { seconds, framePath, resume };
  } catch (error) {
    await resume().catch(() => undefined);
    throw error;
  }
}

// Take the largest video on the page and remember it so the same one is resumed later.
const CAPTURE_JS = `(() => {
  const videos = [...document.querySelectorAll('video')].filter((v) => v.videoWidth > 0);
  if (!videos.length) return JSON.stringify({ error: 'no-video' });
  const video = videos.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
  window.__videoNote = { video, wasPaused: video.paused };
  video.pause();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  let frame;
  try {
    frame = canvas.toDataURL('image/jpeg', 0.9);
  } catch (e) {
    if (!window.__videoNote.wasPaused) video.play();
    return JSON.stringify({ error: 'no-frame', detail: e.message });
  }
  const url = new URL(location.href);
  url.searchParams.delete('t');
  return JSON.stringify({ seconds: video.currentTime, url: url.href, frame });
})()`;

const RESUME_JS = `(() => {
  const state = window.__videoNote;
  if (state && !state.wasPaused) state.video.play();
  return 'ok';
})()`;

const escapeAppleScript = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function browserJs(bundleId: string, js: string): Promise<string> {
  return runAppleScript(
    `tell application id "${bundleId}" to execute active tab of front window javascript "${escapeAppleScript(js)}"`,
  );
}

async function captureBrowser(bundleId: string): Promise<Capture> {
  let raw: string;
  try {
    raw = await browserJs(bundleId, CAPTURE_JS);
  } catch (error) {
    const message = String(error);
    if (message.includes("turned off")) {
      throw new Error(strings.browserJsOff);
    }
    throw error;
  }
  const result = JSON.parse(raw);
  if (result.error === "no-video") throw new Error(strings.browserNoVideo);
  if (result.error) throw new Error(`${strings.browserNoFrame}: ${result.detail}`);
  const framePath = tempFrame();
  writeFileSync(framePath, Buffer.from(result.frame.replace(/^data:image\/jpeg;base64,/, ""), "base64"));
  return {
    seconds: result.seconds,
    framePath,
    recordingUrl: result.url,
    resume: async () => {
      await browserJs(bundleId, RESUME_JS);
    },
  };
}

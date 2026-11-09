import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";

// Pinned static builds from https://github.com/eugeneware/ffmpeg-static (includes libx264, HLS,
// avfoundation on macOS and gdigrab on Windows). Downloaded once on first use and verified by SHA-256.
const VERSION = "b6.1.1";
const BUILDS: Record<string, string> = {
  "darwin-arm64": "8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa",
  "darwin-x64": "929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106",
  "win32-x64": "8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77",
};

function platformKey(): string {
  // Windows on ARM runs the x64 build through emulation.
  const key = process.platform === "win32" ? "win32-x64" : `${process.platform}-${process.arch}`;
  if (!BUILDS[key]) throw new Error(`Screen casting is not supported on ${process.platform}-${process.arch}`);
  return key;
}

/** Returns a usable ffmpeg binary, downloading the bundled build on first use. */
export async function ensureFfmpeg(onProgress?: (message: string) => void): Promise<string> {
  const { ffmpegPath } = getPreferenceValues<{ ffmpegPath?: string }>();
  if (ffmpegPath) {
    if (!fs.existsSync(ffmpegPath)) throw new Error(`ffmpeg not found at ${ffmpegPath} (set in preferences)`);
    return ffmpegPath;
  }

  const key = platformKey();
  const target = path.join(environment.supportPath, `ffmpeg-${VERSION}${process.platform === "win32" ? ".exe" : ""}`);
  if (fs.existsSync(target)) return target;

  onProgress?.("Downloading screen encoder (one-time, ~25 MB)…");
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${VERSION}/ffmpeg-${key}.gz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download encoder: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  const hash = createHash("sha256").update(gz).digest("hex");
  if (hash !== BUILDS[key]) throw new Error("Downloaded encoder failed integrity check");

  onProgress?.("Installing screen encoder…");
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, gunzipSync(gz), { mode: 0o755 });
  fs.renameSync(tmp, target);
  return target;
}

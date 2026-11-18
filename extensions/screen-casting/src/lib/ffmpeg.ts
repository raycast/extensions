import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fetchZipEntry } from "./zip";

// Pinned static ffmpeg builds (include libx264, libvpx, HLS, avfoundation on macOS and gdigrab on Windows).
// Only the ffmpeg binary is pulled out of each zip, and it is verified by SHA-256 before it is installed.
//   macOS:   https://ffmpeg.martin-riedl.de (release builds)
//   Windows: https://github.com/FFmpeg-Builds/FFmpeg-Builds (BtbN; a month-end autobuild of the 9.0 branch,
//            since only those are kept long-term). The winarm64 build has no libvpx (needed for VP8
//            mirroring), so Windows on ARM uses the x64 build through emulation.
const VERSION = "9.0.2";
const RIEDL = "https://ffmpeg.martin-riedl.de/download/macos";
const BTBN_RELEASE = "autobuild-2026-10-31-12-59";
const BTBN_BUILD = "ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0";
const BUILDS: Record<string, { url: string; entry: string; sha256: string }> = {
  "darwin-arm64": {
    url: `${RIEDL}/arm64/1789931890_${VERSION}/ffmpeg.zip`,
    entry: "ffmpeg",
    sha256: "2e11c6f90993cdb79fff84d3f90044d28316b310e75b3e030cfc9a54f2c9d384",
  },
  "darwin-x64": {
    url: `${RIEDL}/amd64/1789931006_${VERSION}/ffmpeg.zip`,
    entry: "ffmpeg",
    sha256: "b25689cf2211c0582d317e849912769a1f1c93904fe102c485b5364a425633d1",
  },
  "win32-x64": {
    url: `https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/${BTBN_RELEASE}/${BTBN_BUILD}.zip`,
    entry: `${BTBN_BUILD}/bin/ffmpeg.exe`,
    sha256: "c930b63cb1ee8b7e2eaf9c15161160edd5c9acad34f0303b5855c8eb142a7e8d",
  },
};

function platformKey(): string {
  // Windows on ARM runs the x64 build through emulation.
  const key = process.platform === "win32" ? "win32-x64" : `${process.platform}-${process.arch}`;
  if (!BUILDS[key]) throw new Error(`Screen casting is not supported on ${process.platform}-${process.arch}`);
  return key;
}

/** Returns a usable ffmpeg binary, downloading the bundled build on first use. */
export async function ensureFfmpeg(onProgress?: (message: string) => void): Promise<string> {
  const { ffmpegPath } = getPreferenceValues<Preferences>();
  if (ffmpegPath) {
    if (!fs.existsSync(ffmpegPath)) throw new Error(`ffmpeg not found at ${ffmpegPath} (set in preferences)`);
    return ffmpegPath;
  }

  const build = BUILDS[platformKey()];
  const name = `ffmpeg-${VERSION}${process.platform === "win32" ? ".exe" : ""}`;
  const target = path.join(environment.supportPath, name);
  if (fs.existsSync(target)) return target;

  onProgress?.(`Downloading screen encoder (one-time, ~${process.platform === "win32" ? 65 : 35} MB)…`);
  const binary = await fetchZipEntry(build.url, build.entry);
  const hash = createHash("sha256").update(binary).digest("hex");
  if (hash !== build.sha256) throw new Error("Downloaded encoder failed integrity check");

  onProgress?.("Installing screen encoder…");
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, binary, { mode: 0o755 });
  fs.renameSync(tmp, target);
  removeOldBuilds(name);
  return target;
}

/** Deletes encoders installed by earlier versions of the extension (e.g. ffmpeg-b6.1.1). */
function removeOldBuilds(current: string) {
  for (const file of fs.readdirSync(environment.supportPath)) {
    if (!file.startsWith("ffmpeg-") || file.startsWith(current)) continue;
    try {
      fs.rmSync(path.join(environment.supportPath, file), { force: true });
    } catch {
      // Still running (Windows locks executables); it will be removed next time.
    }
  }
}

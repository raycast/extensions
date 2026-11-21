import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, stat, unlink } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { run } from "./process";

export interface Tools {
  ytdlp: string;
  ffmpeg: string;
  ffprobe: string;
}
// Pinned release assets and SHA-256 digests published by the maintainers on GitHub.
const YTDLP = {
  url: "https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp.exe",
  sha256: "f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d",
};
const FFMPEG = {
  url: "https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip",
  sha256: "60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba",
  root: "ffmpeg-9.0.2-essentials_build",
};

export async function downloadVerified(
  url: string,
  destination: string,
  expectedHash: string,
  signal: AbortSignal,
  progress: (percent?: number) => void,
): Promise<void> {
  const downloadSignal = AbortSignal.any([signal, AbortSignal.timeout(600000)]);
  const response = await fetch(url, {
    signal: downloadSignal,
    headers: { "User-Agent": "Raycast-Social-Downloader" },
  });
  if (!response.ok || !response.body)
    throw new Error(
      `Component setup failed (HTTP ${response.status}). Try again.`,
    );
  const total = Number(response.headers.get("content-length"));
  const hash = createHash("sha256");
  let received = 0;
  let last = -1;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      hash.update(chunk);
      const percent =
        total > 0
          ? Math.min(100, Math.floor((received * 100) / total))
          : undefined;
      if (percent !== last) {
        last = percent ?? -1;
        progress(percent);
      }
      callback(null, chunk);
    },
  });
  let created = false;
  const output = createWriteStream(destination, { flags: "wx" });
  output.once("open", () => {
    created = true;
  });
  try {
    await pipeline(
      Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
      ),
      meter,
      output,
      { signal: downloadSignal },
    );
    if (hash.digest("hex") !== expectedHash.toLowerCase())
      throw new Error("Component verification failed. Try again.");
  } catch (error) {
    if (created) await unlink(destination).catch(() => undefined);
    throw error;
  }
}

function paths(root: string): Tools {
  return {
    ytdlp: join(root, "yt-dlp.exe"),
    ffmpeg: join(root, "ffmpeg.exe"),
    ffprobe: join(root, "ffprobe.exe"),
  };
}

async function check(tools: Tools, signal: AbortSignal) {
  for (const [name, path] of Object.entries(tools)) {
    if (!(await stat(path)).isFile()) throw new Error("Incomplete component.");
    await run(path, [name === "ytdlp" ? "--version" : "-version"], {
      signal,
      timeout: 15000,
    });
  }
}

export async function ensureTools(
  supportPath: string,
  signal: AbortSignal,
  status: (message: string) => void,
): Promise<Tools> {
  const parent = resolve(supportPath);
  const installed = join(parent, "tools-2026.10.26-9.0.2");
  const tools = paths(installed);
  try {
    await check(tools, signal);
    return tools;
  } catch {
    signal.throwIfAborted();
  }
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".setup-"));
  try {
    const stagedTools = paths(staging);
    status("Downloading required components…");
    await downloadVerified(
      YTDLP.url,
      stagedTools.ytdlp,
      YTDLP.sha256,
      signal,
      (percent) =>
        status(
          `Preparing downloads${percent === undefined ? "…" : `: ${percent}%`}`,
        ),
    );
    const archive = join(staging, "ffmpeg.zip");
    await downloadVerified(
      FFMPEG.url,
      archive,
      FFMPEG.sha256,
      signal,
      (percent) =>
        status(
          `Preparing conversion${percent === undefined ? "…" : `: ${percent}%`}`,
        ),
    );
    status("Finishing setup…");
    const entries = (
      await run("tar.exe", ["-tf", archive], { signal, timeout: 30000 })
    ).split(/\r?\n/);
    const required = [
      `${FFMPEG.root}/bin/ffmpeg.exe`,
      `${FFMPEG.root}/bin/ffprobe.exe`,
    ];
    for (const entry of required)
      if (!entries.includes(entry))
        throw new Error("The conversion package is incomplete.");
    const licenses = entries.filter((entry) =>
      new RegExp(
        `^${FFMPEG.root.replaceAll(".", "\\.")}/(?:LICENSE|COPYING|README)[^/]*$`,
        "i",
      ).test(entry),
    );
    await run(
      "tar.exe",
      ["-xf", archive, "-C", staging, "--", ...required, ...licenses],
      { signal, timeout: 120000 },
    );
    await rename(
      join(staging, FFMPEG.root, "bin", "ffmpeg.exe"),
      stagedTools.ffmpeg,
    );
    await rename(
      join(staging, FFMPEG.root, "bin", "ffprobe.exe"),
      stagedTools.ffprobe,
    );
    await unlink(archive);
    await check(stagedTools, signal);
    signal.throwIfAborted();
    // Only replace this extension's explicitly named toolkit, after the replacement passes checks.
    if (dirname(installed) !== parent)
      throw new Error("Invalid component folder.");
    await rm(installed, { recursive: true, force: true });
    await rename(staging, installed);
    return tools;
  } finally {
    if (dirname(resolve(staging)) === parent)
      await rm(staging, { recursive: true, force: true });
  }
}

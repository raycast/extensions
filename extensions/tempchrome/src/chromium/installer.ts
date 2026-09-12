import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { reportError } from "../utils/reportError";
import { isChromiumBinaryRunning } from "./processes";

export type InstallProgress =
  | { stage: "resolve-revision" }
  | { stage: "download"; bytesDownloaded: number; bytesTotal: number | null; revision: string }
  | { stage: "extract"; revision: string }
  | { stage: "preflight"; revision: string }
  | { stage: "swap"; revision: string }
  | { stage: "xattr"; revision: string }
  | { stage: "cleanup"; revision: string }
  | { stage: "done"; revision: string };

export type RunInstallOptions = {
  binaryPath: string;
  appBundlePath: string;
  signal: AbortSignal;
  onProgress: (progress: InstallProgress) => void;
};

export class ChromiumRunningError extends Error {
  constructor(message = "A Chromium process is already running at the target binary.") {
    super(message);
    this.name = "ChromiumRunningError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class InstallPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstallPathError";
  }
}

export class AbortedError extends Error {
  constructor(message = "Install cancelled.") {
    super(message);
    this.name = "AbortedError";
  }
}

const SNAPSHOT_BASE_URL = "https://storage.googleapis.com/chromium-browser-snapshots";
const PART_FILE_REGEX = /^tempchrome-install-(Mac|Mac_Arm)-(\d+)\.zip\.part$/;

function currentPlatform(): "Mac_Arm" | "Mac" {
  return process.arch === "arm64" ? "Mac_Arm" : "Mac";
}

function partPathFor(platform: "Mac" | "Mac_Arm", revision: string): string {
  return path.join(os.tmpdir(), `tempchrome-install-${platform}-${revision}.zip.part`);
}

async function pruneStaleParts(platform: "Mac" | "Mac_Arm", revision: string): Promise<void> {
  const keepName = `tempchrome-install-${platform}-${revision}.zip.part`;
  let entries: string[];
  try {
    entries = await fs.promises.readdir(os.tmpdir());
  } catch (error) {
    await reportError("pruneStaleParts readdir failed", error, { silent: true });
    return;
  }
  await Promise.all(
    entries
      .filter((name) => PART_FILE_REGEX.test(name) && name !== keepName)
      .map((name) =>
        fs.promises.rm(path.join(os.tmpdir(), name), { force: true }).catch((error) => {
          void reportError(`pruneStaleParts failed to remove ${name}`, error, { silent: true });
        }),
      ),
  );
}

function isAbortErrorLike(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }
  return false;
}

async function ensureParentDir(appBundlePath: string): Promise<void> {
  const parent = path.dirname(appBundlePath);
  try {
    await fs.promises.mkdir(parent, { recursive: true });
  } catch (error) {
    throw new InstallPathError(
      `Cannot create install target parent directory ${parent}: ${(error as Error).message}`,
    );
  }
}

async function streamDownloadToFile(
  url: string,
  partPath: string,
  signal: AbortSignal,
  revision: string,
  onProgress: (progress: InstallProgress) => void,
  resumeFromBytes: number,
  requestedFlags: "w" | "a",
): Promise<void> {
  let response: Response;
  let effectiveResumeBytes = resumeFromBytes;
  let effectiveFlags: "w" | "a" = requestedFlags;

  try {
    const headers = resumeFromBytes > 0 ? { Range: `bytes=${resumeFromBytes}-` } : undefined;
    response = await fetch(url, { signal, ...(headers ? { headers } : {}) });
  } catch (error) {
    if (isAbortErrorLike(error)) {
      throw new AbortedError();
    }
    throw new NetworkError(`Download request failed: ${(error as Error).message}`);
  }

  if (response.status === 416) {
    await fs.promises.rm(partPath, { force: true }).catch(() => undefined);
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (isAbortErrorLike(error)) {
        throw new AbortedError();
      }
      throw new NetworkError(`Download request failed: ${(error as Error).message}`);
    }
    effectiveResumeBytes = 0;
    effectiveFlags = "w";
  }

  if (!response.ok) {
    throw new NetworkError(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new NetworkError("Download response has no body");
  }

  if (response.status === 206) {
    const contentRange = response.headers.get("content-range");
    const match = contentRange ? /bytes\s+(\d+)-/i.exec(contentRange) : null;
    const startByte = match ? parseInt(match[1], 10) : NaN;
    if (!Number.isFinite(startByte) || startByte !== resumeFromBytes) {
      effectiveResumeBytes = 0;
      effectiveFlags = "w";
    } else {
      effectiveResumeBytes = resumeFromBytes;
      effectiveFlags = "a";
    }
  } else if (response.status === 200) {
    effectiveResumeBytes = 0;
    effectiveFlags = "w";
  }

  const totalHeader = response.headers.get("content-length");
  const bodyBytes = totalHeader ? parseInt(totalHeader, 10) || null : null;
  const bytesTotal =
    bodyBytes !== null && effectiveFlags === "a" ? bodyBytes + effectiveResumeBytes : bodyBytes;

  let bytesDownloaded = effectiveResumeBytes;
  onProgress({ stage: "download", bytesDownloaded, bytesTotal, revision });

  const source = Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesDownloaded += chunk.byteLength;
      onProgress({ stage: "download", bytesDownloaded, bytesTotal, revision });
      callback(null, chunk);
    },
  });
  const writeStream = fs.createWriteStream(partPath, { flags: effectiveFlags });

  try {
    await pipeline(source, counter, writeStream, { signal });
  } catch (error) {
    if (isAbortErrorLike(error) || signal.aborted) {
      throw new AbortedError();
    }
    throw new NetworkError(`Download stream interrupted: ${(error as Error).message}`);
  }
}

async function runUnzip(
  zipPath: string,
  extractDir: string,
  signal: AbortSignal,
  registerChild: (child: ChildProcess | null) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("/usr/bin/unzip", ["-oq", zipPath, "-d", extractDir], { signal });
    registerChild(child);

    let stderrBuffer = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    child.on("error", (err) => {
      registerChild(null);
      if (signal.aborted) {
        reject(new AbortedError());
        return;
      }
      reject(new ExtractionError(`unzip failed to spawn: ${err.message}`));
    });

    child.on("close", (code) => {
      registerChild(null);
      if (signal.aborted) {
        reject(new AbortedError());
        return;
      }
      if (code !== 0) {
        reject(
          new ExtractionError(
            `unzip exited with code ${code}${stderrBuffer ? `: ${stderrBuffer.trim()}` : ""}`,
          ),
        );
        return;
      }
      resolve();
    });
  });
}

async function runXattrClear(
  appBundlePath: string,
  signal: AbortSignal,
  registerChild: (child: ChildProcess | null) => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn("/usr/bin/xattr", ["-cr", appBundlePath]);
    registerChild(child);

    child.on("error", (err) => {
      registerChild(null);
      void reportError("xattr clear failed (install)", err, { silent: true });
      resolve();
    });

    child.on("close", (code) => {
      registerChild(null);
      if (signal.aborted) {
        resolve();
        return;
      }
      if (code !== 0) {
        void reportError(
          "xattr clear failed (install)",
          new Error(`xattr -cr exited with code ${code}`),
          { silent: true },
        );
      }
      resolve();
    });
  });
}

export async function runInstall(opts: RunInstallOptions): Promise<{ revision: string }> {
  const { binaryPath, appBundlePath, signal, onProgress } = opts;

  const platform = currentPlatform();
  const runId = `${Date.now()}-${process.pid}`;
  const zipPath = path.join(os.tmpdir(), `tempchrome-install-${runId}.zip`);
  const extractDir = path.join(os.tmpdir(), `tempchrome-install-${runId}`);
  let partPath: string | null = null;

  let activeChild: ChildProcess | null = null;
  const registerChild = (child: ChildProcess | null) => {
    activeChild = child;
  };

  const abortListener = () => {
    if (activeChild && !activeChild.killed) {
      activeChild.kill();
    }
  };
  signal.addEventListener("abort", abortListener);

  let revision = "";

  try {
    signal.throwIfAborted();

    // 1. Preflight
    await ensureParentDir(appBundlePath);
    if (await isChromiumBinaryRunning(binaryPath)) {
      throw new ChromiumRunningError();
    }

    // 2. Resolve revision
    signal.throwIfAborted();
    onProgress({ stage: "resolve-revision" });
    const lastChangeUrl = `${SNAPSHOT_BASE_URL}/${platform}/LAST_CHANGE`;
    let revisionResponse: Response;
    try {
      revisionResponse = await fetch(lastChangeUrl, { signal });
    } catch (error) {
      if (isAbortErrorLike(error)) {
        throw new AbortedError();
      }
      throw new NetworkError(`Could not resolve latest revision: ${(error as Error).message}`);
    }
    if (!revisionResponse.ok) {
      throw new NetworkError(
        `Could not resolve latest revision: HTTP ${revisionResponse.status} ${revisionResponse.statusText}`,
      );
    }
    revision = (await revisionResponse.text()).trim();
    if (!revision) {
      throw new NetworkError("LAST_CHANGE returned an empty body");
    }

    // 3. Stream download (resumable)
    await pruneStaleParts(platform, revision);
    partPath = partPathFor(platform, revision);

    let resumeFromBytes = 0;
    let flags: "w" | "a" = "w";
    try {
      const stat = await fs.promises.stat(partPath);
      if (stat.isFile() && stat.size > 0) {
        resumeFromBytes = stat.size;
        flags = "a";
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && code !== "ENOENT") {
        await reportError("stat partPath failed", error, { silent: true });
      }
    }

    signal.throwIfAborted();
    const zipUrl = `${SNAPSHOT_BASE_URL}/${platform}/${revision}/chrome-mac.zip`;
    await streamDownloadToFile(
      zipUrl,
      partPath,
      signal,
      revision,
      onProgress,
      resumeFromBytes,
      flags,
    );
    signal.throwIfAborted();
    await fs.promises.rename(partPath, zipPath);
    // From this point, partPath no longer exists; null it so the finally block doesn't re-delete.
    const completedPartPath = partPath;
    partPath = null;
    await fs.promises.rm(completedPartPath, { force: true }).catch(() => undefined);

    // 4. Extract
    signal.throwIfAborted();
    onProgress({ stage: "extract", revision });
    await fs.promises.rm(extractDir, { recursive: true, force: true });
    await fs.promises.mkdir(extractDir, { recursive: true });
    await runUnzip(zipPath, extractDir, signal, registerChild);
    signal.throwIfAborted();

    const sourceApp = path.join(extractDir, "chrome-mac", "Chromium.app");
    try {
      const stat = await fs.promises.stat(sourceApp);
      if (!stat.isDirectory()) {
        throw new ExtractionError("Chromium.app not in archive");
      }
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      throw new ExtractionError("Chromium.app not in archive");
    }

    // 5. Swap
    signal.throwIfAborted();
    onProgress({ stage: "preflight", revision });
    if (await isChromiumBinaryRunning(binaryPath)) {
      throw new ChromiumRunningError();
    }
    signal.throwIfAborted();
    onProgress({ stage: "swap", revision });
    await fs.promises.rm(appBundlePath, { recursive: true, force: true });
    try {
      try {
        await fs.promises.rename(sourceApp, appBundlePath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EXDEV") {
          await fs.promises.cp(sourceApp, appBundlePath, { recursive: true, force: true });
          await fs.promises.rm(sourceApp, { recursive: true, force: true });
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new InstallPathError(
        `Chromium bundle at ${appBundlePath} is no longer present. Could not place Chromium.app at ${appBundlePath}: ${(error as Error).message}`,
      );
    }

    // 6. Clear quarantine
    signal.throwIfAborted();
    onProgress({ stage: "xattr", revision });
    await runXattrClear(appBundlePath, signal, registerChild);

    // 7. Cleanup
    signal.throwIfAborted();
    onProgress({ stage: "cleanup", revision });
    await fs.promises.rm(extractDir, { recursive: true, force: true });
    await fs.promises.rm(zipPath, { force: true });

    onProgress({ stage: "done", revision });
    return { revision };
  } catch (error) {
    if (isAbortErrorLike(error)) {
      throw new AbortedError();
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", abortListener);
    if (activeChild && !(activeChild as ChildProcess).killed) {
      (activeChild as ChildProcess).kill();
    }
    // NOTE: partPath is intentionally NOT cleaned up here — a cancelled or failed
    // download leaves the part file in place so the next install attempt can
    // resume via HTTP Range. On success, the part file is already gone
    // (renamed to zipPath and then rm'd explicitly above).
    await fs.promises.rm(zipPath, { force: true }).catch(() => undefined);
    await fs.promises.rm(extractDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { FdLookup, findFd } from "./fd";

/** Current upstream release, pinned with the SHA-256 of each macOS archive. */
export const PORTABLE_FD_VERSION = "10.5.0";

export type PortableFdArchitecture = "arm64" | "x64";

export type PortableFdAsset = {
  archive: string;
  bytes: number;
  sha256: string;
  target: string;
};

const ASSETS: Record<PortableFdArchitecture, PortableFdAsset> = {
  arm64: {
    archive: `fd-v${PORTABLE_FD_VERSION}-aarch64-apple-darwin.tar.gz`,
    bytes: 1_334_374,
    sha256: "b67e1836c468e42e411984b56e52fa7abec08c2bd22c867398e7cc134aac5e12",
    target: "aarch64-apple-darwin",
  },
  x64: {
    archive: `fd-v${PORTABLE_FD_VERSION}-x86_64-apple-darwin.tar.gz`,
    bytes: 1_426_858,
    sha256: "7e31028c62c6955877735d0406807aa484c2a5e6f86235a59e26c29c301da590",
    target: "x86_64-apple-darwin",
  },
};

const RELEASE_BASE = `https://github.com/sharkdp/fd/releases/download/v${PORTABLE_FD_VERSION}`;
const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
const MANIFEST_NAME = "manifest.json";

type PortableFdManifest = {
  version: 1;
  fdVersion: string;
  architecture: PortableFdArchitecture;
  archiveSha256: string;
  binarySha256: string;
};

export type FdDownloadStage = "downloading" | "verifying";

export type EnsureFdOptions = {
  supportPath: string;
  preference?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onProgress?: (stage: FdDownloadStage) => void;
  /** Test seam; production uses findFd. */
  lookupFd?: typeof findFd;
};

export function portableFdAsset(
  architecture: NodeJS.Architecture,
): PortableFdAsset | undefined {
  return architecture === "arm64" || architecture === "x64"
    ? ASSETS[architecture]
    : undefined;
}

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Reject an altered, truncated, or unexpectedly replaced release archive. */
export function verifyArchiveChecksum(
  data: Uint8Array,
  asset: PortableFdAsset,
): string {
  if (data.byteLength !== asset.bytes)
    throw new Error(
      `fd archive size mismatch: expected ${asset.bytes} bytes, received ${data.byteLength}.`,
    );
  const actual = sha256(data);
  if (actual !== asset.sha256)
    throw new Error(
      `fd archive checksum mismatch: expected ${asset.sha256}, received ${actual}.`,
    );
  return actual;
}

function portableDirectory(
  supportPath: string,
  architecture: PortableFdArchitecture,
): string {
  return path.join(
    supportPath,
    "portable-fd",
    `v${PORTABLE_FD_VERSION}-${architecture}`,
  );
}

function abortError(): Error {
  return Object.assign(new Error("fd download was cancelled."), {
    name: "AbortError",
  });
}

async function run(
  command: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw abortError();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) return reject(abortError());
      if (code === 0) return resolve(Buffer.concat(output).toString("utf8"));
      const detail = Buffer.concat(errors).toString("utf8").trim();
      reject(
        new Error(
          `${path.basename(command)} stopped with status ${code}${detail ? `: ${detail}` : ""}`,
        ),
      );
    });
  });
}

async function download(url: string, signal?: AbortSignal): Promise<Buffer> {
  const response = await fetch(url, { redirect: "follow", signal });
  if (!response.ok)
    throw new Error(`fd download failed with HTTP ${response.status}.`);
  const announced = Number(response.headers.get("content-length"));
  if (Number.isFinite(announced) && announced > MAX_ARCHIVE_BYTES)
    throw new Error("fd download was unexpectedly large.");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.byteLength > MAX_ARCHIVE_BYTES)
    throw new Error("fd download was unexpectedly large.");
  return data;
}

async function readVerifiedPortable(
  directory: string,
  architecture: PortableFdArchitecture,
  asset: PortableFdAsset,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const binary = path.join(directory, "fd");
  try {
    const manifest = JSON.parse(
      await fsp.readFile(path.join(directory, MANIFEST_NAME), "utf8"),
    ) as PortableFdManifest;
    if (
      manifest.version !== 1 ||
      manifest.fdVersion !== PORTABLE_FD_VERSION ||
      manifest.architecture !== architecture ||
      manifest.archiveSha256 !== asset.sha256
    )
      return undefined;
    await fsp.access(binary, fs.constants.X_OK);
    if (sha256(await fsp.readFile(binary)) !== manifest.binarySha256)
      return undefined;
    if (
      (await run(binary, ["--version"], signal)).trim() !==
      `fd ${PORTABLE_FD_VERSION}`
    )
      return undefined;
    return binary;
  } catch {
    return undefined;
  }
}

async function installPortableFd(
  options: EnsureFdOptions,
  architecture: PortableFdArchitecture,
  asset: PortableFdAsset,
): Promise<string> {
  const root = path.join(options.supportPath, "portable-fd");
  const destination = portableDirectory(options.supportPath, architecture);
  const installed = await readVerifiedPortable(
    destination,
    architecture,
    asset,
    options.signal,
  );
  if (installed) return installed;

  options.onProgress?.("downloading");
  const archiveData = await download(
    `${RELEASE_BASE}/${asset.archive}`,
    options.signal,
  );
  options.onProgress?.("verifying");
  verifyArchiveChecksum(archiveData, asset);

  await fsp.mkdir(root, { recursive: true });
  const nonce = randomUUID();
  const archive = path.join(root, `.download-${nonce}.tar.gz`);
  const staging = path.join(root, `.install-${nonce}`);
  try {
    await fsp.writeFile(archive, archiveData, { mode: 0o600 });
    await fsp.mkdir(staging, { mode: 0o700 });
    const member = `fd-v${PORTABLE_FD_VERSION}-${asset.target}/fd`;
    await run(
      "/usr/bin/tar",
      ["-xzf", archive, "-C", staging, "--strip-components", "1", member],
      options.signal,
    );
    const stagedBinary = path.join(staging, "fd");
    await fsp.chmod(stagedBinary, 0o700);
    if (
      (await run(stagedBinary, ["--version"], options.signal)).trim() !==
      `fd ${PORTABLE_FD_VERSION}`
    )
      throw new Error(
        "The downloaded executable did not report the pinned fd version.",
      );
    const manifest: PortableFdManifest = {
      version: 1,
      fdVersion: PORTABLE_FD_VERSION,
      architecture,
      archiveSha256: asset.sha256,
      binarySha256: sha256(await fsp.readFile(stagedBinary)),
    };
    await fsp.writeFile(
      path.join(staging, MANIFEST_NAME),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
    await fsp.rm(destination, { recursive: true, force: true });
    await fsp.rename(staging, destination);
    return path.join(destination, "fd");
  } finally {
    await Promise.all([
      fsp.rm(archive, { force: true }),
      fsp.rm(staging, { recursive: true, force: true }),
    ]);
  }
}

/**
 * Prefer the user's fd. Only a genuinely missing binary triggers the verified
 * portable download; a bad explicit preference remains visible as an error.
 * The caller serializes this operation with index writes and data deletion.
 */
export async function ensureFd(options: EnsureFdOptions): Promise<FdLookup> {
  const lookup = (options.lookupFd ?? findFd)(options.preference, options.env);
  if (lookup.kind !== "missing") return lookup;
  const architecture = process.arch;
  if (architecture !== "arm64" && architecture !== "x64")
    return {
      kind: "missing",
      reason: `Automatic fd download does not support ${architecture}.`,
    };
  const asset = ASSETS[architecture];
  try {
    const binary = await installPortableFd(options, architecture, asset);
    return { kind: "found", path: binary, source: "portable" };
  } catch (error) {
    return {
      kind: "missing",
      reason: `fd could not be downloaded and verified: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

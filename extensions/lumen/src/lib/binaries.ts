import { Toast, environment, showToast } from "@raycast/api";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

// fd/fzf are downloaded on first use (the right build for the CPU) into the extension's
// support dir, then cached. This keeps the published extension small and works on both
// Apple Silicon and Intel. Pinned versions for reproducibility.
const FD_VERSION = "10.3.0";
const FZF_VERSION = "0.73.1";

const isArm = process.arch === "arm64";

// Expected SHA-256 of each release tarball. The download is verified against the matching
// digest before the binary is extracted or executed, so a tampered asset or hijacked
// download is rejected instead of run. Update these whenever a pinned version changes.
const SHA256 = {
  "fd-arm64": "0570263812089120bc2a5d84f9e65cd0c25e4a4d724c80075c357239c74ae904",
  "fd-x64": "50d30f13fe3d5914b14c4fff5abcbd4d0cdab4b855970a6956f4f006c17117a3",
  "fzf-arm64": "d27fd68c04fb9b42f7c73a3f7d38069a74d308e40174f64a072c747213e97286",
  "fzf-x64": "75bbf15248d1cf0a13eafc75b8a55f5075c437e2ba6d76899afc53f4f3e1b38c",
} as const;

function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function binDir(): string {
  return join(environment.supportPath, "bin");
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr.trim() || `${cmd} exited ${code}`))));
  });
}

async function findFile(dir: string, name: string): Promise<string | null> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

async function ensureBinary(name: string, url: string, expectedSha256: string): Promise<string> {
  const dest = join(binDir(), name);
  if (existsSync(dest)) return dest;

  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${name}…` });
  const tmpDir = join(binDir(), `.${name}-dl`);
  try {
    await mkdir(binDir(), { recursive: true });
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
    const tarball = join(tmpDir, "archive.tar.gz");
    await run("curl", ["-fsSL", url, "-o", tarball]); // curl follows the GitHub redirect
    const actual = await sha256File(tarball);
    if (actual !== expectedSha256) {
      throw new Error(`${name} checksum mismatch (expected ${expectedSha256}, got ${actual})`);
    }
    await run("tar", ["xzf", tarball, "-C", tmpDir]);
    const found = await findFile(tmpDir, name);
    if (!found) throw new Error(`${name} not found in archive`);
    await copyFile(found, dest);
    await chmod(dest, 0o755);
    toast.style = Toast.Style.Success;
    toast.title = `${name} ready`;
    return dest;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not download ${name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    throw e;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export function ensureFd(): Promise<string> {
  const a = isArm ? "aarch64" : "x86_64";
  const url = `https://github.com/sharkdp/fd/releases/download/v${FD_VERSION}/fd-v${FD_VERSION}-${a}-apple-darwin.tar.gz`;
  return ensureBinary("fd", url, isArm ? SHA256["fd-arm64"] : SHA256["fd-x64"]);
}

export function ensureFzf(): Promise<string> {
  const a = isArm ? "arm64" : "amd64";
  const url = `https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}/fzf-${FZF_VERSION}-darwin_${a}.tar.gz`;
  return ensureBinary("fzf", url, isArm ? SHA256["fzf-arm64"] : SHA256["fzf-x64"]);
}

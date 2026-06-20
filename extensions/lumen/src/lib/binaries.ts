import { Toast, environment, showToast } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

// fd/fzf are downloaded on first use (the right build for the CPU) into the extension's
// support dir, then cached. This keeps the published extension small and works on both
// Apple Silicon and Intel. Pinned versions for reproducibility.
const FD_VERSION = "10.4.2";
const FZF_VERSION = "0.73.1";

const isArm = process.arch === "arm64";

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

async function ensureBinary(name: string, url: string): Promise<string> {
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
  return ensureBinary("fd", url);
}

export function ensureFzf(): Promise<string> {
  const a = isArm ? "arm64" : "amd64";
  const url = `https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}/fzf-${FZF_VERSION}-darwin_${a}.tar.gz`;
  return ensureBinary("fzf", url);
}

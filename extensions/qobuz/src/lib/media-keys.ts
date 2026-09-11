import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type MediaKey = "play" | "next" | "previous" | "forward" | "rewind";

const sourcePath = join(environment.assetsPath, "media-key.swift");

// Content-address the compiled binary by the Swift source's hash, so a changed
// helper lands at a new path and recompiles instead of serving a stale /tmp
// build across extension updates.
const ensureBinary = async (): Promise<string> => {
  const source = await readFile(sourcePath);
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
  const binaryPath = join(tmpdir(), "qobuz-raycast", `media-key-${hash}`);
  if (existsSync(binaryPath)) return binaryPath;
  await mkdir(dirname(binaryPath), { recursive: true });
  await exec("swiftc", ["-O", sourcePath, "-o", binaryPath]);
  return binaryPath;
};

export const sendMediaKey = async (key: MediaKey): Promise<void> => {
  const binary = await ensureBinary();
  try {
    await exec(binary, [key]);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr;
    throw new Error(stderr?.trim() || `failed to send media key: ${key}`);
  }
};

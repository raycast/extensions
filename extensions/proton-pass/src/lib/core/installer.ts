import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Artifact } from "./artifact";
import { extractZip } from "./zip";

const execFileAsync = promisify(execFile);

export interface InstallArtifactOptions {
  artifact: Artifact;
  download: (url: string) => Promise<Buffer>;
  destDir: string;
  tmpDir: string;
  platform: string;
}

export async function installArtifact(options: InstallArtifactOptions): Promise<string> {
  const { artifact, download, destDir, tmpDir, platform } = options;
  const binaryPath = path.join(destDir, artifact.binaryName);
  let attemptDir: string | undefined;
  try {
    await mkdir(path.dirname(tmpDir), { recursive: true });
    attemptDir = await mkdtemp(`${tmpDir}-`);
    const buffer = await download(artifact.url);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== artifact.sha256) {
      throw new Error(`SHA256 hash mismatch. Expected: ${artifact.sha256}, Got: ${hash}`);
    }
    const stagedDir = path.join(attemptDir, "install");
    await mkdir(stagedDir, { recursive: true });
    const stagedBinary = path.join(stagedDir, artifact.binaryName);
    if (artifact.kind === "raw") {
      await writeFile(stagedBinary, buffer);
    } else {
      await extractZip(buffer, stagedDir);
      for (const requiredFile of artifact.requiredFiles) {
        try {
          await access(path.join(stagedDir, requiredFile));
        } catch {
          throw new Error(`ZIP does not contain ${requiredFile}`);
        }
      }
    }

    if (platform === "darwin") {
      await chmod(stagedBinary, 0o755);
      try {
        await execFileAsync("/usr/bin/xattr", ["-d", "com.apple.quarantine", stagedBinary]);
      } catch {
        // Quarantine attribute may not exist.
      }
    }

    await mkdir(path.dirname(destDir), { recursive: true });
    try {
      await rename(stagedDir, destDir);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      for (const requiredFile of artifact.requiredFiles) {
        await access(path.join(destDir, requiredFile));
      }
    }
    return binaryPath;
  } finally {
    if (attemptDir) await rm(attemptDir, { recursive: true, force: true });
  }
}

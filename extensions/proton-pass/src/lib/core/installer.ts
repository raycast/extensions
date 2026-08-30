import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, chmod, cp, mkdir, rm, writeFile } from "node:fs/promises";
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
  try {
    await rm(tmpDir, { recursive: true, force: true });
    const buffer = await download(artifact.url);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== artifact.sha256) {
      throw new Error(`SHA256 hash mismatch. Expected: ${artifact.sha256}, Got: ${hash}`);
    }
    await mkdir(tmpDir, { recursive: true });
    const stagedDir = path.join(tmpDir, "install");
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

    await mkdir(destDir, { recursive: true });
    await cp(stagedDir, destDir, { recursive: true });

    if (platform === "darwin") {
      await chmod(binaryPath, 0o755);
      try {
        await execFileAsync("/usr/bin/xattr", ["-d", "com.apple.quarantine", binaryPath]);
      } catch {
        // Quarantine attribute may not exist.
      }
    }
    return binaryPath;
  } catch (error) {
    await rm(destDir, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const RIPGREP_PREBUILT_VERSION = "v13.0.0-10";

export type SupportedRipgrepArchitecture = "arm64" | "x64";
export type RipgrepTarget = "aarch64-apple-darwin" | "x86_64-apple-darwin";

export interface BundledRipgrepAsset {
  target: RipgrepTarget;
  fileName: string;
  url: string;
  sha256: string;
}

const SHA256_BY_TARGET: Record<RipgrepTarget, string> = {
  "aarch64-apple-darwin": "de44338ca53677968bdd7403ddc1cf9c735e708f7b63e3b34367f9411010a7db",
  "x86_64-apple-darwin": "3b501c05ff9b1d24ae8897dd1c6b5bf842fd12a6f7114264407ac42bc222b25b",
};

export function getBundledRipgrepAsset(platform: NodeJS.Platform, architecture: string): BundledRipgrepAsset {
  if (platform !== "darwin") {
    throw new Error(`Bundled ripgrep is unsupported on platform: ${platform}`);
  }

  let target: RipgrepTarget;
  if (architecture === "arm64") target = "aarch64-apple-darwin";
  else if (architecture === "x64") target = "x86_64-apple-darwin";
  else throw new Error(`Bundled ripgrep is unsupported on architecture: ${architecture}`);

  const fileName = `ripgrep-${RIPGREP_PREBUILT_VERSION}-${target}.tar.gz`;
  return {
    target,
    fileName,
    url: `https://github.com/microsoft/ripgrep-prebuilt/releases/download/${RIPGREP_PREBUILT_VERSION}/${fileName}`,
    sha256: SHA256_BY_TARGET[target],
  };
}

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function hasExpectedSha256(data: Uint8Array, expected: string): boolean {
  return sha256(data) === expected.toLowerCase();
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function extractTarGz(archivePath: string, destination: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("tar", ["xf", archivePath, "-C", destination], {
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 64 * 1024) stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => reject(new Error(`Failed to start tar: ${error.message}`)));
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to extract ripgrep (tar exit ${code ?? "unknown"}): ${stderr.trim()}`));
    });
  });
}

export interface InstallBundledRipgrepOptions {
  platform?: NodeJS.Platform;
  architecture?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Installs the verified binary atomically beneath the supplied support path.
 * The caller owns choosing Raycast's environment.supportPath.
 */
export async function installBundledRipgrep(
  supportPath: string,
  options: InstallBundledRipgrepOptions = {},
): Promise<string> {
  const binaryDirectory = join(supportPath, "bin");
  const binaryPath = join(binaryDirectory, "rg");
  if (await isExecutable(binaryPath)) return binaryPath;

  const asset = getBundledRipgrepAsset(options.platform ?? process.platform, options.architecture ?? process.arch);
  const fetchImpl = options.fetchImpl ?? fetch;
  const temporaryRoot = join(supportPath, ".tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const workDirectory = await mkdtemp(join(temporaryRoot, "ripgrep-"));
  const archivePath = join(workDirectory, asset.fileName);
  const extractDirectory = join(workDirectory, "extract");

  try {
    const response = await fetchImpl(asset.url);
    if (!response.ok) {
      throw new Error(`Failed to download bundled ripgrep: ${response.status} ${response.statusText}`);
    }

    const archive = new Uint8Array(await response.arrayBuffer());
    const actualSha256 = sha256(archive);
    if (actualSha256 !== asset.sha256) {
      throw new Error(
        `Bundled ripgrep checksum mismatch for ${asset.fileName}: expected ${asset.sha256}, got ${actualSha256}`,
      );
    }

    await writeFile(archivePath, archive);
    await mkdir(extractDirectory, { recursive: true });
    await extractTarGz(archivePath, extractDirectory);

    const extractedBinary = join(extractDirectory, "rg");
    await access(extractedBinary, fsConstants.R_OK);
    await chmod(extractedBinary, 0o755);
    await mkdir(binaryDirectory, { recursive: true });
    await rename(extractedBinary, binaryPath);
    return binaryPath;
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

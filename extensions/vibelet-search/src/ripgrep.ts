import { execFile } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const REPOSITORY = "microsoft/ripgrep-prebuilt";
const VERSION = "v13.0.0-10";
const EXPECTED_SHA256_BY_TARGET: Record<string, string> = {
  "aarch64-apple-darwin.tar.gz": "de44338ca53677968bdd7403ddc1cf9c735e708f7b63e3b34367f9411010a7db",
  "x86_64-apple-darwin.tar.gz": "3b501c05ff9b1d24ae8897dd1c6b5bf842fd12a6f7114264407ac42bc222b25b",
};

const execFileAsync = promisify(execFile);

let ensurePromise: Promise<string> | undefined;

function getTarget(): string {
  if (os.platform() !== "darwin") {
    throw new Error(`Unsupported platform for ripgrep download: ${os.platform()}`);
  }

  return os.arch() === "arm64" ? "aarch64-apple-darwin.tar.gz" : "x86_64-apple-darwin.tar.gz";
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

async function downloadFile(url: string, outFile: string, expectedSha256: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ripgrep: ${response.status} ${response.statusText}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  const actualSha256 = sha256(data);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Downloaded ripgrep checksum mismatch for ${path.basename(outFile)}: expected ${expectedSha256}, got ${actualSha256}`,
    );
  }

  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.writeFile(outFile, data);
}

async function untarGz(inFile: string, outDir: string): Promise<void> {
  await fs.promises.mkdir(outDir, { recursive: true });
  try {
    await execFileAsync("tar", ["xf", inFile, "-C", outDir], { timeout: 30000 });
  } catch (error) {
    const e = error as { stderr?: string | Buffer; message?: string };
    const stderrText = typeof e.stderr === "string" ? e.stderr : e.stderr?.toString();
    throw new Error(`Failed to extract ripgrep: ${stderrText || e.message || String(error)}`);
  }
}

async function installRipgrep(): Promise<string> {
  const { environment } = await import("@raycast/api");
  const binDir = path.join(environment.supportPath, "bin");
  const rgPath = path.join(binDir, "rg");

  try {
    await fs.promises.access(rgPath, fs.constants.X_OK);
    return rgPath;
  } catch {
    // Download below.
  }

  const target = getTarget();
  const expectedSha256 = EXPECTED_SHA256_BY_TARGET[target];
  if (!expectedSha256) {
    throw new Error(`Missing ripgrep checksum for target: ${target}`);
  }

  const url = `https://github.com/${REPOSITORY}/releases/download/${VERSION}/ripgrep-${VERSION}-${target}`;
  const tempFilePath = path.join(environment.supportPath, ".tmp", `ripgrep-${VERSION}-${target}`);

  try {
    await downloadFile(url, tempFilePath, expectedSha256);
    await untarGz(tempFilePath, binDir);
    await fs.promises.chmod(rgPath, 0o755);
    return rgPath;
  } finally {
    await fs.promises.rm(tempFilePath, { force: true });
  }
}

export function ensureRipgrep(): Promise<string> {
  ensurePromise ??= installRipgrep().catch((error) => {
    ensurePromise = undefined;
    throw error;
  });
  return ensurePromise;
}

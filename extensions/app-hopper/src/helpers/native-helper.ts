import { createHash } from "node:crypto";
import fs from "node:fs";
import { chmod, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { execBinary, getErrorMessage, getRaycastPaths, OSA_TIMEOUT_MS } from "./applescript";
import { getNativeHelper, nativeHelperSources, nativeHelperSourceHash } from "../native-helper-catalog";

const COMPILE_TIMEOUT_MS = 30000;
const compilePromises = new Map<string, Promise<string>>();
const sourceHashCache = new Map<string, string>();
const verifiedBundles = new Map<string, string>();

/** Bundled helpers are built for both architectures; verify the shipped checksum once per host process. */
function findBundledHelper(binaryPrefix: string, sourceHash: string): string | undefined {
  const assets = getRaycastPaths().assetsPath;
  if (!assets) return undefined;
  const manifestPath = path.join(assets, "native", "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1)
    throw new Error("App Hopper's native helper package is invalid. Reinstall the extension.");
  const entry = manifest.helpers?.[binaryPrefix];
  if (!entry || entry.sourceHash !== sourceHash) return undefined;
  if (entry.file !== `${binaryPrefix}-${sourceHash}` || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
    throw new Error("App Hopper's native helper package is invalid. Reinstall the extension.");
  }
  const file = path.join(assets, "native", entry.file);
  if (verifiedBundles.get(file) !== entry.sha256) {
    const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (hash !== entry.sha256) throw new Error("App Hopper's native helper is damaged. Reinstall the extension.");
    verifiedBundles.set(file, hash);
  }
  return file;
}

export function resolveNativeHelper(
  name: string,
  fallbackSupportDir: string,
): { sourcePaths: string[]; sourceHash: string; binaryPath: string; bundledBinaryPath?: string } {
  const helper = getNativeHelper(name);
  const { assetsPath, supportPath } = getRaycastPaths();
  const assets = assetsPath ?? path.resolve("assets");
  const sourcePaths = nativeHelperSources(helper, assets);
  const cacheKey = sourcePaths.join("\0");

  let suffix = sourceHashCache.get(cacheKey);
  if (!suffix) {
    suffix = nativeHelperSourceHash(helper, assets);
    sourceHashCache.set(cacheKey, suffix);
  }

  const binaryPath = path.join(supportPath || fallbackSupportDir, `${name}-${suffix}`);
  return { sourcePaths, sourceHash: suffix, binaryPath, bundledBinaryPath: findBundledHelper(name, suffix) };
}

export async function ensureNativeHelper(name: string, fallbackSupportDir: string): Promise<string> {
  const { sourcePaths, binaryPath, bundledBinaryPath } = resolveNativeHelper(name, fallbackSupportDir);
  if (bundledBinaryPath) {
    if ((fs.statSync(bundledBinaryPath).mode & 0o111) === 0) await chmod(bundledBinaryPath, 0o755);
    return bundledBinaryPath;
  }
  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  const pending = compilePromises.get(binaryPath);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const supportDir = path.dirname(binaryPath);
      await mkdir(supportDir, { recursive: true });
      const tempPath = `${binaryPath}.${process.pid}.${Date.now()}.tmp`;
      try {
        await execBinary("/usr/bin/swiftc", ["-O", ...sourcePaths, "-o", tempPath], {
          timeout: COMPILE_TIMEOUT_MS,
        });
        await rename(tempPath, binaryPath);
      } finally {
        await rm(tempPath, { force: true });
      }
      return binaryPath;
    } finally {
      compilePromises.delete(binaryPath);
    }
  })();

  compilePromises.set(binaryPath, promise);
  return promise;
}

export async function runNativeHelper(name: string, fallbackSupportDir: string, args: string[]): Promise<string> {
  try {
    const binaryPath = await ensureNativeHelper(name, fallbackSupportDir);
    const { stdout } = await execBinary(binaryPath, args, {
      timeout: OSA_TIMEOUT_MS,
    });
    return stdout.trimEnd();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

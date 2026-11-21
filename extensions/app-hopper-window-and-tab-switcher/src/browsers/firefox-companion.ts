import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { execBinary, getRaycastPaths } from "../helpers/applescript";
import { geckoConfig, type GeckoBrowserId } from "./gecko-config";
import { FIREFOX_ADDON_ID, FIREFOX_DIRECTORY, ZEN_DIRECTORY } from "./firefox-integration";

export interface FirefoxCompanionRelease {
  version: string;
  xpiUrl: string;
  sha256: string;
}

const MAX_XPI_BYTES = 10 * 1024 * 1024;

function httpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("Firefox companion downloads must use HTTPS without credentials or fragments");
  }
  return url;
}

function validateRelease(value: unknown): FirefoxCompanionRelease {
  const release = value as Partial<FirefoxCompanionRelease> | null;
  if (
    !release ||
    typeof release.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(release.version) ||
    typeof release.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(release.sha256) ||
    typeof release.xpiUrl !== "string" ||
    !httpsUrl(release.xpiUrl).pathname.toLowerCase().endsWith(".xpi")
  ) {
    throw new Error("Firefox companion release needs a version, HTTPS XPI URL, and SHA-256 checksum");
  }
  return release as FirefoxCompanionRelease;
}

export async function getFirefoxCompanionRelease(): Promise<FirefoxCompanionRelease | null> {
  const assets = getRaycastPaths().assetsPath ?? path.resolve("assets");
  const config = JSON.parse(await readFile(path.join(assets, "companion-integration.json"), "utf8"));
  if (config.companion === null) return null;
  return validateRelease(config.companion);
}

export function hasFirefoxCompanionUpdate(versions: string[], release: FirefoxCompanionRelease): boolean {
  return versions.some((version) => {
    const current = version.split(".").map(Number);
    const target = release.version.split(".").map(Number);
    if (current.some((part) => !Number.isSafeInteger(part))) return false;
    for (let index = 0; index < Math.max(current.length, target.length); index++) {
      const difference = (target[index] ?? 0) - (current[index] ?? 0);
      if (difference) return difference > 0;
    }
    return false;
  });
}

async function validatePackage(
  file: string,
  release: FirefoxCompanionRelease,
  browserId: GeckoBrowserId,
): Promise<void> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_XPI_BYTES) throw new Error("Firefox companion package is too large");
  const digest = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  if (digest !== release.sha256) throw new Error("Firefox companion checksum did not match. Download was discarded.");
  const { stdout } = await execBinary("/usr/bin/unzip", ["-p", file, "manifest.json"]);
  const manifest = JSON.parse(stdout);
  const id = manifest.browser_specific_settings?.gecko?.id ?? manifest.applications?.gecko?.id;
  if (
    id !== (browserId === "firefox" ? FIREFOX_ADDON_ID : geckoConfig(browserId).addonId) ||
    manifest.version !== release.version
  ) {
    throw new Error("Firefox companion identity or version did not match the release");
  }
  // Firefox verifies Mozilla's cryptographic signature when the user confirms installation.
}

const downloads = new Map<string, Promise<string>>();

export async function downloadFirefoxCompanion(
  release: FirefoxCompanionRelease,
  fetcher: typeof fetch = fetch,
  browserId: GeckoBrowserId = "firefox",
): Promise<string> {
  validateRelease(release);
  const key = JSON.stringify([browserId, release]);
  const pending = downloads.get(key);
  if (pending) return pending;
  const download = (async () => {
    const directory = path.join(browserId === "zen" ? ZEN_DIRECTORY : FIREFOX_DIRECTORY, "companion");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const file = path.join(directory, `app-hopper-${browserId}-${release.version}-${release.sha256.slice(0, 12)}.xpi`);
    try {
      await validatePackage(file, release, browserId);
      return file;
    } catch {
      // A missing or damaged cached file must be downloaded and verified again.
    }
    const temp = `${file}.${randomUUID()}.tmp`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      let url = httpsUrl(release.xpiUrl);
      let response: Response | undefined;
      for (let redirects = 0; redirects <= 5; redirects++) {
        response = await fetcher(url.href, { redirect: "manual", signal: controller.signal });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 5) throw new Error("Invalid Firefox companion download redirect");
        url = httpsUrl(new URL(location, url).href);
      }
      if (!response?.ok) throw new Error(`Firefox companion download failed (HTTP ${response?.status})`);
      if (Number(response.headers.get("content-length")) > MAX_XPI_BYTES) {
        await response.body?.cancel();
        throw new Error("Firefox companion package is too large");
      }
      if (!response.body) throw new Error("Firefox companion download was empty");
      const output = await open(temp, "wx", 0o600);
      const reader = response.body.getReader();
      try {
        let size = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > MAX_XPI_BYTES) throw new Error("Firefox companion package is too large");
          await output.writeFile(chunk.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        await output.close();
      }
      await validatePackage(temp, release, browserId);
      await rename(temp, file);
      return file;
    } finally {
      clearTimeout(timer);
      await rm(temp, { force: true });
    }
  })();
  downloads.set(key, download);
  try {
    return await download;
  } finally {
    downloads.delete(key);
  }
}

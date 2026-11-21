import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { geckoConfig, type GeckoBrowserId } from "./gecko-config";
import { getNativeExecutable, nativeHelperArguments } from "../helpers/swift-package";

const LEGACY_FIREFOX_DIRECTORY = path.join(homedir(), "Library/Application Support/raycast-yabai-firefox");
export const FIREFOX_DIRECTORY = path.join(homedir(), "Library/Application Support/raycast-app-hopper-firefox");
export const FIREFOX_HOST_NAME = "app_hopper.firefox";
export const FIREFOX_ADDON_ID = "app-hopper-firefox@chenghsj";

export const ZEN_DIRECTORY = path.join(homedir(), "Library/Application Support/raycast-app-hopper-zen");

export function geckoDirectory(id: GeckoBrowserId = "firefox") {
  return id === "zen" ? ZEN_DIRECTORY : FIREFOX_DIRECTORY;
}

function integrationPaths(id: GeckoBrowserId = "firefox") {
  const config = geckoConfig(id);
  return {
    manifestPath: path.join(
      homedir(),
      "Library/Application Support/Mozilla/NativeMessagingHosts",
      `${config.hostName}.json`,
    ),
  };
}

async function expectedHost(id: GeckoBrowserId = "firefox") {
  const config = geckoConfig(id);
  const paths = integrationPaths(id);
  const executable = await getNativeExecutable();
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  const command = [executable, ...nativeHelperArguments("firefox-bridge", ["--directory", geckoDirectory(id)])];
  // Firefox launches a reviewable text script; the executable is produced by ray build.
  const launcher = `#!/bin/sh\nexec ${command.map(quote).join(" ")}\n`;
  const hash = createHash("sha256").update(launcher).digest("hex").slice(0, 12);
  const binary = path.join(geckoDirectory(id), `${config.binaryPrefix}-${hash}`);
  const manifest = {
    name: config.hostName,
    description: `App Hopper ${config.appName} integration`,
    path: binary,
    type: "stdio",
    allowed_extensions: [config.addonId],
  };
  return { ...paths, binary, manifest, launcher };
}

async function isExecutable(file: string) {
  const info = await stat(file).catch(() => null);
  return !!info?.isFile() && (info.mode & 0o111) !== 0;
}

function ownsHostRegistration(value: unknown, id: GeckoBrowserId, directory: string) {
  if (!value || typeof value !== "object") return false;
  const manifest = value as { name?: unknown; path?: unknown; allowed_extensions?: unknown };
  const config = geckoConfig(id);
  const allowed = JSON.stringify(manifest.allowed_extensions);
  return (
    manifest.name === config.hostName &&
    (allowed === JSON.stringify([config.addonId]) ||
      (id === "zen" && allowed === JSON.stringify(["app-hopper-zen@chenghsj"]))) &&
    typeof manifest.path === "string" &&
    path.dirname(manifest.path) === directory &&
    new RegExp(`^${config.binaryPrefix}-[a-f0-9]{12}$`).test(path.basename(manifest.path))
  );
}

async function hasLegacyFirefoxHost() {
  const raw = await readFile(integrationPaths().manifestPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  try {
    return raw !== null && ownsHostRegistration(JSON.parse(raw), "firefox", LEGACY_FIREFOX_DIRECTORY);
  } catch {
    return false;
  }
}

export async function migrateFirefoxHost(): Promise<void> {
  if (await hasLegacyFirefoxHost()) await writeFirefoxHost("firefox", true);
}

export async function isFirefoxHostInstalled(id: GeckoBrowserId = "firefox"): Promise<boolean> {
  const expected = await expectedHost(id);
  try {
    const manifest = JSON.parse(await readFile(expected.manifestPath, "utf8"));
    return (
      JSON.stringify(manifest) === JSON.stringify(expected.manifest) &&
      (await isExecutable(expected.binary)) &&
      (await readFile(expected.binary, "utf8")) === expected.launcher
    );
  } catch {
    return false;
  }
}

export async function hasFirefoxHostRegistration(id: GeckoBrowserId = "firefox"): Promise<boolean> {
  return (await stat(integrationPaths(id).manifestPath).catch(() => null))?.isFile() ?? false;
}

const installations = new Map<GeckoBrowserId, Promise<void>>();

/** Install per-user files only; Firefox owns the helper process, with no login item or daemon. */
export function installFirefoxHost(id: GeckoBrowserId = "firefox"): Promise<void> {
  return writeFirefoxHost(id);
}

async function writeFirefoxHost(id: GeckoBrowserId, migrating = false): Promise<void> {
  const pending = installations.get(id);
  if (pending) {
    await pending;
    if (migrating || (await isFirefoxHostInstalled(id))) return;
    return writeFirefoxHost(id);
  }
  const directory = geckoDirectory(id);
  const installation = (async () => {
    const expected = await expectedHost(id);
    const manifestPath = expected.manifestPath;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const validLauncher =
      (await isExecutable(expected.binary)) &&
      (await readFile(expected.binary, "utf8").catch(() => "")) === expected.launcher;
    if (!validLauncher) {
      const temp = `${expected.binary}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, expected.launcher, { mode: 0o700, flag: "wx" });
        await chmod(temp, 0o700);
        await rename(temp, expected.binary);
      } finally {
        await rm(temp, { force: true });
      }
    }
    await mkdir(path.dirname(manifestPath), { recursive: true });
    const temp = `${manifestPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(expected.manifest, null, 2) + "\n", { mode: 0o600, flag: "wx" });
      // The legacy directory may also belong to Yabai. Publish only our new registration.
      if (!migrating || (await hasLegacyFirefoxHost())) await rename(temp, manifestPath);
    } finally {
      await rm(temp, { force: true });
    }
  })();
  installations.set(id, installation);
  try {
    await installation;
  } finally {
    installations.delete(id);
  }
}

/** Remove only this integration's files; preserve AX helpers and unrelated native manifests. */
export async function removeFirefoxHost(
  disconnect: () => Promise<void>,
  id: GeckoBrowserId = "firefox",
): Promise<void> {
  await installations.get(id);
  const config = geckoConfig(id);
  const directory = geckoDirectory(id);
  const manifestPath = integrationPaths(id).manifestPath;
  const raw = await readFile(manifestPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (raw !== null) {
    const manifest = JSON.parse(raw);
    const ownsLegacy = id === "firefox" && ownsHostRegistration(manifest, id, LEGACY_FIREFOX_DIRECTORY);
    if (!ownsLegacy && !ownsHostRegistration(manifest, id, directory)) {
      throw new Error("The Firefox native manifest is not owned by App Hopper; it was left unchanged");
    }
    await rm(manifestPath, { force: true });
  }
  // Removing the manifest first prevents Firefox from starting another helper during cleanup.
  await disconnect();
  const files = await readdir(directory).catch(() => []);
  for (const file of files) {
    if (new RegExp(`^${config.binaryPrefix}-[a-f0-9]{12}$`).test(file))
      await rm(path.join(directory, file), { force: true });
  }
  await rm(path.join(directory, "companion"), { recursive: true, force: true });
  await rm(path.join(directory, "module-cache"), { recursive: true, force: true });
}

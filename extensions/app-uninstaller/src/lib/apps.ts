import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { basename, join } from "path";
import { exec, execOrEmpty, mapWithLimit, readPlist } from "./exec";
import { APP_ROOTS, HOMEBREW_CASKROOMS } from "./locations";

export interface InstalledApp {
  /** Absolute path to the `.app` bundle. */
  path: string;
  /** Display name, without the `.app` extension. */
  name: string;
  bundleId: string;
  version?: string;
  /** Bundle name / executable name, used as extra match tokens. */
  aliases: string[];
  /** Installed from the Mac App Store (the bundle carries a receipt). */
  fromAppStore: boolean;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readApp(path: string): Promise<InstalledApp | null> {
  const info = await readPlist(join(path, "Contents/Info.plist"));
  const name = basename(path).replace(/\.app$/i, "");
  const bundleId = asString(info?.CFBundleIdentifier);

  // Without a bundle identifier we would have nothing but the display name to
  // match on, which is far too weak to delete files from. Skip the bundle.
  if (!bundleId) return null;

  const aliases = [
    asString(info?.CFBundleName),
    asString(info?.CFBundleExecutable),
    asString(info?.CFBundleDisplayName),
  ];

  return {
    path,
    name,
    bundleId,
    version: asString(info?.CFBundleShortVersionString) ?? asString(info?.CFBundleVersion),
    aliases: [...new Set(aliases.filter((alias): alias is string => Boolean(alias) && alias !== name))],
    fromAppStore: existsSync(join(path, "Contents/_MASReceipt/receipt")),
  };
}

/** Every third-party application bundle installed in a user-removable location. */
export async function listInstalledApps(): Promise<InstalledApp[]> {
  const bundles: string[] = [];

  for (const root of APP_ROOTS) {
    let entries;
    try {
      entries = await readdir(root.path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.name.endsWith(".app") || entry.name.startsWith(".")) continue;
      if (root.containers.includes(entry.name)) continue;
      bundles.push(join(root.path, entry.name));
    }
  }

  const apps = await mapWithLimit([...new Set(bundles)], 16, readApp);
  return apps
    .filter((app): app is InstalledApp => app !== null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** True when a process is currently running out of the app bundle. */
export async function isAppRunning(app: InstalledApp): Promise<boolean> {
  const stdout = await execOrEmpty("/bin/ps", ["-A", "-o", "comm="], 5_000);
  return stdout.split("\n").some((line) => line.startsWith(`${app.path}/`));
}

/** Ask the app to quit. Returns false if it refused or was not running. */
export async function quitApp(app: InstalledApp): Promise<boolean> {
  try {
    await exec(
      "/usr/bin/osascript",
      ["-e", "on run argv", "-e", "tell application id (item 1 of argv) to quit", "-e", "end run", "--", app.bundleId],
      10_000,
    );
    return true;
  } catch {
    return false;
  }
}

/** Ask a running application to quit, by its display name. */
export async function quitAppNamed(name: string): Promise<boolean> {
  try {
    await exec(
      "/usr/bin/osascript",
      ["-e", "on run argv", "-e", "tell application (item 1 of argv) to quit", "-e", "end run", "--", name],
      10_000,
    );
    return true;
  } catch {
    return false;
  }
}

/** Homebrew cask token for this app, if it was installed with `brew`. */
export async function findCaskToken(app: InstalledApp): Promise<string | null> {
  const slug = app.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  for (const caskroom of HOMEBREW_CASKROOMS) {
    let tokens: string[];
    try {
      tokens = await readdir(caskroom);
    } catch {
      continue;
    }
    // A cask directory named exactly after the app is a strong signal; anything
    // looser would risk suggesting the wrong `brew uninstall`.
    if (tokens.includes(slug)) return slug;
  }
  return null;
}

/** Installer receipt package IDs belonging to this app. */
export async function findPackageReceipts(app: InstalledApp): Promise<string[]> {
  const stdout = await execOrEmpty("/usr/sbin/pkgutil", ["--pkgs"], 10_000);
  const prefix = app.bundleId.toLowerCase();
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((id) => id && !id.startsWith("com.apple."))
    .filter((id) => {
      const lower = id.toLowerCase();
      return lower === prefix || lower.startsWith(`${prefix}.`);
    });
}

/** A vendor-supplied uninstaller shipped next to or inside the app bundle. */
export async function findVendorUninstaller(app: InstalledApp): Promise<string | null> {
  const candidates = [join(app.path, "Contents/Resources"), join(app.path, "Contents/MacOS")];

  for (const dir of candidates) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    const match = entries.find((entry) => /uninstall/i.test(entry) && /\.(app|tool|sh|command)$/i.test(entry));
    if (match) return join(dir, match);
  }
  return null;
}

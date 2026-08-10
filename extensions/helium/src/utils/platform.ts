import { getPreferenceValues } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";

/**
 * Single source of truth for the platform split.
 *
 * Everything else in the extension should branch on the helpers here instead of
 * checking `process.platform` inline: macOS drives Helium through AppleScript
 * and a fixed `Application Support` profile root, Windows drives it through the
 * Chromium executable and a `%LOCALAPPDATA%` profile root.
 *
 * `environment` does not expose the platform, so `process.platform` is what we
 * have.
 */
export const isWindows = process.platform === "win32";

/** macOS bundle identifier, used as the `Action.Open` application target. */
export const HELIUM_BUNDLE_ID = "net.imput.helium";

/**
 * Helium for Windows is built on ungoogled-chromium and currently keeps the
 * upstream binary name, but ships under its own vendor folder. Probe both
 * namings so a rebrand doesn't silently break detection.
 */
const WINDOWS_INSTALL_SUFFIXES = [join("imput", "Helium"), "Helium"];
const WINDOWS_EXECUTABLE_NAMES = ["chrome.exe", "helium.exe"];

/** Where Chromium browsers record their real install path, whatever it is. */
const START_MENU_INTERNET_KEYS = [
  "HKCU\\Software\\Clients\\StartMenuInternet",
  "HKLM\\Software\\Clients\\StartMenuInternet",
];

/**
 * User-provided override for installs we cannot discover — portable zip
 * builds in particular, which register nothing. `undefined` when unset.
 */
export function getHeliumPathPreference(): string | undefined {
  const { heliumPath } = getPreferenceValues<{ heliumPath?: string }>();
  const trimmed = heliumPath?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Install roots in probe order: the per-user location the default installer
 * uses first, then the machine-wide ones.
 */
export function getWindowsInstallRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const bases = [env.LOCALAPPDATA, env.PROGRAMFILES, env["PROGRAMFILES(X86)"]].filter((base): base is string => !!base);
  return bases.flatMap((base) => WINDOWS_INSTALL_SUFFIXES.map((suffix) => join(base, suffix)));
}

/**
 * Read Helium's registered executable path out of the registry.
 *
 * Chromium's Windows installer writes the real path to
 * `Clients\StartMenuInternet\<AppName>\shell\open\command` regardless of where
 * the user installed it, which is the only reliable way to find installs
 * outside the standard roots (a different drive, a machine-wide install, a
 * renamed folder). Portable archives register nothing and fall back to the
 * `heliumPath` preference.
 */
export function findHeliumExecutableInRegistry(runQuery: (key: string) => string = queryRegistry): string | undefined {
  for (const key of START_MENU_INTERNET_KEYS) {
    for (const candidate of parseStartMenuInternetCommands(runQuery(key))) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function queryRegistry(key: string): string {
  try {
    return execFileSync("reg", ["query", key, "/s"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });
  } catch {
    // Missing key, no reg.exe, or a timeout — treated as "nothing registered".
    return "";
  }
}

/**
 * Pull the `(Default)` values of every `…\StartMenuInternet\Helium*\shell\open\command`
 * key out of `reg query /s` output. Key lines start at column 0; value lines
 * are indented and shaped `(Default)    REG_SZ    "C:\path\to\app.exe"`.
 */
export function parseStartMenuInternetCommands(registryOutput: string): string[] {
  const commands: string[] = [];
  let inHeliumCommandKey = false;

  for (const line of registryOutput.split(/\r?\n/)) {
    if (/^HKEY_/.test(line)) {
      inHeliumCommandKey = /StartMenuInternet\\Helium/i.test(line) && /\\shell\\open\\command$/i.test(line);
      continue;
    }

    if (!inHeliumCommandKey) continue;

    const value = line.split(/REG_SZ\s+/)[1]?.trim();
    if (!value) continue;

    // The command may carry arguments after the (possibly quoted) executable.
    const quoted = value.match(/^"([^"]+)"/);
    commands.push(quoted ? quoted[1] : value.split(/\s+/)[0]);
  }

  return commands;
}

interface WindowsPathOptions {
  override?: string;
  env?: NodeJS.ProcessEnv;
  /** Injectable so tests never touch the real registry. */
  registryLookup?: () => string | undefined;
}

/**
 * Locate Helium's executable on Windows, in order of confidence: the user's
 * override, the standard install roots (cheap, covers the default installer),
 * then the registry (a subprocess, so it only runs when the guesses miss).
 */
export function findHeliumExecutable(options: WindowsPathOptions = {}): string | undefined {
  const override = "override" in options ? options.override : getHeliumPathPreference();
  if (override && existsSync(override)) return override;

  for (const root of getWindowsInstallRoots(options.env)) {
    for (const executableName of WINDOWS_EXECUTABLE_NAMES) {
      const candidate = join(root, "Application", executableName);
      if (existsSync(candidate)) return candidate;
    }
  }

  const registryLookup = options.registryLookup ?? (() => findHeliumExecutableInRegistry());
  return registryLookup();
}

/**
 * Cached wrapper around {@link findHeliumExecutable}. Resolution can shell out
 * to `reg.exe`, and the app target is read during render, so the answer is
 * memoized for the lifetime of the command process.
 */
let cachedExecutable: { value: string | undefined } | undefined;

export function findHeliumExecutableCached(): string | undefined {
  if (!cachedExecutable) cachedExecutable = { value: findHeliumExecutable() };
  return cachedExecutable.value;
}

/**
 * Same as {@link findHeliumExecutableCached} but throws an actionable message
 * instead of returning `undefined`, so command-level catch blocks surface it in
 * a toast rather than failing silently.
 */
export function requireHeliumExecutable(): string {
  const executable = findHeliumExecutableCached();
  if (!executable) {
    throw new Error(
      "Helium was not found. Checked the standard install locations and the Windows registry. " +
        "If Helium is installed elsewhere (for example a portable build), set its full path to " +
        "chrome.exe in this extension's preferences.",
    );
  }
  return executable;
}

/**
 * The application to hand to `Action.Open` / `open()`: the bundle id on macOS,
 * the resolved executable path on Windows. `undefined` means "let the system
 * decide", which is the right fallback when Helium can't be located.
 */
export function getHeliumAppTarget(): string | undefined {
  if (!isWindows) return getHeliumPathPreference() ?? HELIUM_BUNDLE_ID;
  return findHeliumExecutableCached();
}

/**
 * The Chromium "User Data" root holding `Local State` and the profile folders.
 *
 * A per-user install keeps it beside the executable, but a machine-wide install
 * under Program Files still stores profiles in `%LOCALAPPDATA%`, so the path
 * cannot simply be derived from the executable — candidates are probed in turn.
 */
export function getWindowsUserDataPath(options: WindowsPathOptions = {}): string | undefined {
  const env = options.env ?? process.env;
  const executable =
    "override" in options || options.env ? findHeliumExecutable(options) : findHeliumExecutableCached();

  const candidates: string[] = [];
  if (executable) candidates.push(join(dirname(dirname(executable)), "User Data"));
  for (const root of getWindowsInstallRoots(env)) candidates.push(join(root, "User Data"));

  const existing = candidates.find((candidate) => existsSync(candidate));
  if (existing) return existing;

  return candidates[0];
}

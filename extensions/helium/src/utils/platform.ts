import { getPreferenceValues } from "@raycast/api";
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
 * Helium for Windows keeps the upstream Chromium binary name, so the executable
 * lives at `<install root>\Application\chrome.exe`, not `helium.exe`.
 */
const WINDOWS_INSTALL_SUFFIX = join("imput", "Helium");
const WINDOWS_EXECUTABLE_SUFFIX = join("Application", "chrome.exe");

/**
 * User-provided override for unusual installs (portable builds, custom install
 * directories). `undefined` when the user has not set it.
 */
export function getHeliumPathPreference(): string | undefined {
  const { heliumPath } = getPreferenceValues<{ heliumPath?: string }>();
  const trimmed = heliumPath?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Windows install roots in probe order: the per-user location the default
 * installer uses first, then the machine-wide ones.
 */
export function getWindowsInstallRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots = [env.LOCALAPPDATA, env.PROGRAMFILES, env["PROGRAMFILES(X86)"]];
  return roots.filter((root): root is string => !!root).map((root) => join(root, WINDOWS_INSTALL_SUFFIX));
}

interface WindowsPathOptions {
  override?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Locate Helium's executable on Windows: the preference wins when it points at
 * something that exists, then the known install roots. Returns `undefined` when
 * Helium isn't installed.
 */
export function findHeliumExecutable(options: WindowsPathOptions = {}): string | undefined {
  const override = "override" in options ? options.override : getHeliumPathPreference();
  if (override && existsSync(override)) return override;

  for (const root of getWindowsInstallRoots(options.env)) {
    const candidate = join(root, WINDOWS_EXECUTABLE_SUFFIX);
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Same as {@link findHeliumExecutable} but throws an actionable message instead
 * of returning `undefined`, so command-level catch blocks surface it in a toast
 * rather than failing silently.
 */
export function requireHeliumExecutable(): string {
  const executable = findHeliumExecutable();
  if (!executable) {
    throw new Error("Helium was not found. Install Helium or set its location in the extension preferences.");
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
  return findHeliumExecutable();
}

/**
 * The Chromium "User Data" root of a Windows install, derived from the
 * executable at `<root>\Application\chrome.exe` so portable installs pointed at
 * by the preference resolve to their own profile data. Falls back to the
 * default per-user location when Helium isn't installed, which keeps the
 * profile helpers returning a stable (if empty) path.
 */
export function getWindowsUserDataPath(options: WindowsPathOptions = {}): string | undefined {
  const executable = findHeliumExecutable(options);
  if (executable) return join(dirname(dirname(executable)), "User Data");

  const [defaultRoot] = getWindowsInstallRoots(options.env);
  return defaultRoot ? join(defaultRoot, "User Data") : undefined;
}

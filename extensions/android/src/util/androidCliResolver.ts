import { CommandRunner } from "./commandRunner";

// Pure binary-resolution + installer-selection logic for the `android` CLI.
// Raycast-free and dependency-injected so the precedence can be unit-tested
// with a fake runner/filesystem.

export interface ResolveDeps {
  /** Value of the optional `androidCliPath` preference (may be blank). */
  preferencePath?: string;
  /** The single command-execution seam, used for the login-shell PATH lookup. */
  runner: CommandRunner;
  /** Filesystem probe (real impl: fs.existsSync). */
  fileExists: (path: string) => boolean;
  /** User home directory (real impl: os.homedir()). */
  homeDir: string;
}

/**
 * Resolve the `android` binary path using the precedence from the PRD:
 *   1. the `androidCliPath` preference, if set and present on disk;
 *   2. a login-shell lookup that loads the user's real PATH (Raycast runs a
 *      non-login shell that typically lacks it);
 *   3. known install locations.
 * Returns undefined when the binary cannot be found anywhere.
 */
export async function resolveAndroidCliPath(
  deps: ResolveDeps
): Promise<string | undefined> {
  const raw = deps.preferencePath?.trim();
  const preference = raw ? expandHome(raw, deps.homeDir) : undefined;
  if (preference && deps.fileExists(preference)) {
    return preference;
  }

  const fromShell = await loginShellLookup(deps.runner, deps.fileExists);
  if (fromShell) {
    return fromShell;
  }

  for (const candidate of knownLocations(deps.homeDir)) {
    if (deps.fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * The command used to discover `android` on the user's real PATH. A
 * NON-interactive login shell (`-lc`) sources the login profiles Raycast's
 * non-login shell skips, while avoiding the interactive (`-i`) prompt machinery
 * (Powerlevel10k/gitstatus/terminal shell-integration) that pollutes stdout
 * with banners and escape sequences ahead of the real path.
 */
export function loginShellLookupCommand(shell: string): string {
  return `${shell} -lc 'command -v android'`;
}

async function loginShellLookup(
  runner: CommandRunner,
  fileExists: (path: string) => boolean
): Promise<string | undefined> {
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const out = await runner.exec(loginShellLookupCommand(shell));
    // Scan every line (not just the first) for an absolute path that actually
    // exists on disk. This tolerates any rc noise that slips through and never
    // returns an unverified path, so a bad result falls through to the
    // known-locations probe instead of poisoning every later CLI invocation.
    for (const line of out.split("\n")) {
      const candidate = line.trim();
      if (candidate.startsWith("/") && fileExists(candidate)) {
        return candidate;
      }
    }
    return undefined;
  } catch {
    // `command -v` exits non-zero when nothing is found; fall through.
    return undefined;
  }
}

/** Expand a leading `~`/`~/` to the home directory; other paths are unchanged. */
export function expandHome(p: string, homeDir: string): string {
  if (p === "~") return homeDir;
  if (p.startsWith("~/")) return `${homeDir}${p.slice(1)}`;
  return p;
}

function knownLocations(homeDir: string): string[] {
  return [
    "/usr/local/bin/android",
    "/opt/homebrew/bin/android",
    `${homeDir}/.local/bin/android`,
  ];
}

function installerSlug(arch: string): string {
  return arch === "arm64" ? "darwin_arm64" : "darwin_x86_64";
}

/** The official per-architecture installer script URL. */
export function installerUrlForArch(arch: string): string {
  return `https://dl.google.com/android/cli/latest/${installerSlug(
    arch
  )}/install.sh`;
}

/** The copyable one-liner shown in the not-installed onboarding state. */
export function installCommandForArch(arch: string): string {
  return `curl -fsSL ${installerUrlForArch(arch)} | bash`;
}

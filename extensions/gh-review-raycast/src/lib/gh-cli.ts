/**
 * Locates and shells out to the local `gh` CLI. Exactly like the Go version,
 * the extension never manages or stores a token itself — it borrows one from
 * the authenticated CLI at call time.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import { PATH_ENV, findBinary } from "./binaries";
import { prefs } from "./preferences";

const run = promisify(execFile);

/** Raised when gh is missing or unauthenticated; carries a user-facing hint. */
export class GhError extends Error {
  readonly hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = "GhError";
    this.hint = hint;
  }
}

export const NOT_INSTALLED_HINT =
  "Install it from https://cli.github.com (e.g. `brew install gh`), then run `gh auth login`.";

/**
 * Returns the gh binary path: the user's preference if set, else the first
 * known install location that exists.
 */
export function ghPath(): string {
  const configured = (prefs().ghPath ?? "").trim();
  if (configured) {
    if (!existsSync(configured)) {
      throw new GhError(
        `No gh binary at ${configured}`,
        "Fix the “gh CLI Path” preference, or clear it to auto-detect.",
      );
    }
    return configured;
  }

  const found = findBinary("gh");
  if (!found) {
    throw new GhError("The GitHub CLI (`gh`) was not found", NOT_INSTALLED_HINT);
  }
  return found;
}

/**
 * Runs `gh` and returns both streams without throwing on a non-zero exit.
 * Some `gh` subcommands (notably `auth status` on older versions) write their
 * useful output to stderr, so both are needed.
 */
export async function ghRaw(args: string[]): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const bin = ghPath();
  try {
    const { stdout, stderr } = await run(bin, args, {
      env: { ...process.env, PATH: PATH_ENV },
      timeout: 20_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), ok: true };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { stdout: String(e.stdout ?? "").trim(), stderr: String(e.stderr ?? "").trim(), ok: false };
  }
}

/** Runs `gh` with the given arguments and returns trimmed stdout. */
export async function gh(args: string[]): Promise<string> {
  const bin = ghPath();
  try {
    const { stdout } = await run(bin, args, {
      // A generous PATH so gh can find git and its own credential helpers.
      env: { ...process.env, PATH: PATH_ENV },
      timeout: 20_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
    throw new GhError(
      stderr || `Running \`gh ${args.join(" ")}\` failed`,
      "Try running `gh auth login` in a terminal.",
    );
  }
}

// The token is stable for the lifetime of a command invocation; cache it so a
// list refresh doesn't spawn a subprocess per query.
let tokenCache: { value: string; at: number } | undefined;
const TOKEN_TTL_MS = 5 * 60 * 1000;

/** Returns the OAuth token for `host` via `gh auth token`. */
export async function token(host: string): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS) {
    return tokenCache.value;
  }
  const args = ["auth", "token"];
  if (host) args.push("--hostname", host);

  const value = await gh(args);
  if (!value) {
    throw new GhError("gh returned an empty token", "Run `gh auth login` to authenticate.");
  }
  tokenCache = { value, at: Date.now() };
  return value;
}

/** Drops the cached token, forcing the next call to re-read it from gh. */
export function forgetToken(): void {
  tokenCache = undefined;
}

/**
 * The `gh auth login` argv. Only for a first sign-in — see {@link refreshArgs}
 * for the case where a credential already exists.
 *
 * `--clipboard` puts the one-time device code straight on the clipboard, so
 * it's one paste rather than selecting it out of terminal output.
 *
 * The "Authenticate Git with your GitHub credentials?" prompt can't currently
 * be skipped — gh has no flag for it (cli/cli#11374) and asks even when a
 * credential helper is already configured. It's unrelated to this extension;
 * either answer is fine.
 */
export function loginArgs(host: string): string[] {
  const args = ["gh", "auth", "login", "--web", "--clipboard", "--git-protocol", "https"];
  if (host) args.push("--hostname", host);
  return args;
}

/**
 * The `gh auth refresh` argv — the right command when a credential already
 * exists and just needs re-authorizing (SAML SSO) or widening (scopes).
 *
 * Unlike `gh auth login` it asks nothing about Git, so it goes straight to the
 * browser: one command, no prompts.
 */
export function refreshArgs(host: string, scopes: string[] = []): string[] {
  const args = ["gh", "auth", "refresh", "--clipboard"];
  if (scopes.length > 0) args.push("--scopes", scopes.join(","));
  if (host) args.push("--hostname", host);
  return args;
}

/** The `gh auth login` command line, for display and for the clipboard. */
export function loginCommand(host: string): string {
  return host ? `gh auth login --hostname ${host} --web` : "gh auth login --web";
}

/** The `gh auth refresh` command line, for display and for the clipboard. */
export function refreshCommand(host: string, scopes: string[] = []): string {
  return refreshArgs(host, scopes).join(" ").replace(/^gh /, "gh ");
}

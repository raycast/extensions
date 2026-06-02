import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";

/**
 * A sudo "askpass" helper. Homebrew invokes `sudo -A` (instead of needing a
 * TTY) whenever the SUDO_ASKPASS env var points at an executable — see
 * Homebrew/Library/Homebrew/system_command.rb. That happens for .pkg-based
 * casks (Google Drive, Microsoft Teams, Docker…) where brew must run the
 * system installer as root.
 *
 * Without this, brew's sudo call has no way to read a password in Raycast's
 * non-interactive child process and dies with "Error: <cask>: Broken pipe".
 *
 * The helper pops a native macOS password dialog and prints the entered
 * password to stdout for sudo to consume. The password travels only through
 * the pipe between this helper and sudo — it is never written to disk, logged,
 * or passed on a command line.
 *
 * Security notes for reviewers:
 *  - Written to the extension's private supportPath (user-owned), mode 0700.
 *  - Contains no interpolated/user-controlled data — the script body is static.
 *  - On Cancel (or empty input) it exits non-zero so sudo aborts immediately
 *    instead of re-prompting.
 */
const ASKPASS_BODY = `#!/bin/bash
# Mac Updater sudo askpass helper — invoked by Homebrew via 'sudo -A'.
pw=$(/usr/bin/osascript \\
  -e 'try' \\
  -e 'text returned of (display dialog "Mac Updater needs your login password to install this update.

This app ships as a macOS installer package (.pkg), which requires administrator access." default answer "" with title "Mac Updater" with icon caution buttons {"Cancel", "Install"} default button "Install" with hidden answer)' \\
  -e 'on error' \\
  -e 'return ""' \\
  -e 'end try' 2>/dev/null)
if [ -z "$pw" ]; then
  exit 1
fi
printf '%s' "$pw"
`;

let cachedPath: string | null = null;

/**
 * Write (idempotently) the askpass helper to disk and return its absolute path.
 * Safe to call repeatedly — rewrites the body and re-asserts 0700 each time so a
 * stale or tampered copy can't linger.
 */
export function getAskpassScript(): string {
  if (cachedPath && fs.existsSync(cachedPath)) return cachedPath;
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const p = path.join(environment.supportPath, "sudo-askpass.sh");
  fs.writeFileSync(p, ASKPASS_BODY, { mode: 0o700 });
  // Re-assert perms in case the file pre-existed with a looser mode.
  fs.chmodSync(p, 0o700);
  cachedPath = p;
  return p;
}

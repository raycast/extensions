import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { appleScriptString, runAppleScript } from "./applescript";

export const FSEARCH_REPO = "https://github.com/noahdunnagan/fsearch";
/** Builds fsearch from source and puts it in ~/.cargo/bin, where the extension finds it. */
export const FSEARCH_INSTALL_COMMAND = `cargo install --git ${FSEARCH_REPO}`;
/** The same build, with `cargo` named by its path so it runs on a shell whose PATH lacks it. */
export function fsearchInstallCommand(cargo = "cargo"): string {
  return `${shellQuote(cargo)} install --git ${FSEARCH_REPO}`;
}
/** rustup's official installer, non-interactive, then the new toolchain on this shell's PATH. */
export const RUST_INSTALL_COMMAND = `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env"`;

const CARGO_CANDIDATES = [
  join(homedir(), ".cargo/bin/cargo"),
  "/opt/homebrew/bin/cargo",
  "/usr/local/bin/cargo",
];

/**
 * The installed cargo executable, so the install command can skip rustup
 * and run it by path (Terminal's shell may not have it on PATH), or
 * undefined when no Rust toolchain is found.
 */
export async function findCargo(): Promise<string | undefined> {
  for (const candidate of CARGO_CANDIDATES) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next location.
    }
  }
  return undefined;
}

/**
 * The whole install as one shell line: with the found cargo when there is
 * one, or Rust first when it is missing (rustup puts cargo on this shell's PATH).
 */
export function installCommand(cargo: string | undefined): string {
  return cargo
    ? fsearchInstallCommand(cargo)
    : `${RUST_INSTALL_COMMAND} && ${FSEARCH_INSTALL_COMMAND}`;
}

/** Quotes a value for a POSIX shell, unless it is a plain command name. */
export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Opens Terminal and runs the command in a new window, so progress is visible. */
export async function runInTerminal(command: string): Promise<void> {
  await runAppleScript(
    [
      'tell application "Terminal"',
      "activate",
      `do script ${appleScriptString(command)}`,
      "end tell",
    ].join("\n"),
  );
}

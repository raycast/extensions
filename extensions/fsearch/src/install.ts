import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { appleScriptString, runAppleScript } from "./applescript";

export const FSEARCH_REPO = "https://github.com/noahdunnagan/fsearch";
/** Builds fsearch from source and puts it in ~/.cargo/bin, where the extension finds it. */
export const FSEARCH_INSTALL_COMMAND = `cargo install --git ${FSEARCH_REPO}`;
/** rustup's official installer, non-interactive, then the new toolchain on this shell's PATH. */
export const RUST_INSTALL_COMMAND = `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env"`;

const CARGO_CANDIDATES = [
  join(homedir(), ".cargo/bin/cargo"),
  "/opt/homebrew/bin/cargo",
  "/usr/local/bin/cargo",
];

/** Whether a Rust toolchain is already installed, so the install command can skip rustup. */
export async function hasRust(): Promise<boolean> {
  for (const candidate of CARGO_CANDIDATES) {
    try {
      await access(candidate, constants.X_OK);
      return true;
    } catch {
      // Try the next location.
    }
  }
  return false;
}

/** The whole install as one shell line: Rust first when it is missing. */
export function installCommand(rust: boolean): string {
  return rust
    ? FSEARCH_INSTALL_COMMAND
    : `${RUST_INSTALL_COMMAND} && ${FSEARCH_INSTALL_COMMAND}`;
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

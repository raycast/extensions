import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment, open, showHUD } from "@raycast/api";

const REPO_URL = "https://github.com/noahdunnagan/fsearch";

// Runs in the user's Terminal so they can follow the build and answer the Rust prompt.
const SCRIPT = `#!/bin/bash
set -euo pipefail
clear
echo "==> Installing fsearch from ${REPO_URL}"
echo

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

if ! command -v cargo >/dev/null 2>&1; then
  echo "fsearch is built from source and needs Rust (cargo), which isn't installed."
  read -r -p "Install Rust with rustup (https://rustup.rs)? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Cancelled. Install Rust, then run Install fsearch again from Raycast."
    exit 1
  fi
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Install the Xcode Command Line Tools with: xcode-select --install"
  exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

echo "==> Downloading source"
git clone --depth 1 --quiet "${REPO_URL}" "$workdir/fsearch"
cd "$workdir/fsearch"

echo "==> Building (about 30 seconds)"
cargo build --release

echo "==> Installing to ~/.local/bin/fsearch and starting it at login"
./target/release/fsearch install --login

echo
echo "Done. fsearch indexes your disk on first run (~25s)."
echo
echo "To search everything, grant Full Disk Access to ~/.local/bin/fsearch in"
echo "System Settings > Privacy & Security > Full Disk Access (again after each update)."
read -r -p "Open that settings pane now? [y/N] " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
fi
echo "You can close this window."
`;

/** Opens Terminal with a script that builds fsearch from source and installs it as a login item. */
export async function installInTerminal() {
  await mkdir(environment.supportPath, { recursive: true });
  const scriptPath = join(environment.supportPath, "install-fsearch.command");
  await writeFile(scriptPath, SCRIPT);
  await chmod(scriptPath, 0o755);
  await open(scriptPath, "com.apple.Terminal");
  await showHUD("Installing fsearch in Terminal");
}

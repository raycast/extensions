import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const REPO_URL = "https://github.com/noahdunnagan/fsearch";

// Runs in Terminal so the user can follow the build and answer the Rust prompt.
const SCRIPT = `#!/bin/bash
set -euo pipefail
clear
echo "==> Installing FSearch from ${REPO_URL}"
echo

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

if ! command -v cargo >/dev/null 2>&1; then
  echo "FSearch is built from source and needs Rust (cargo), which isn't installed."
  read -r -p "Install Rust with rustup (https://rustup.rs)? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Cancelled. Install Rust, then run Install FSearch again from Raycast."
    exit 1
  fi
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Install the Xcode Command Line Tools with: xcode-select --install"
  exit 1
fi

install_tmp="$(mktemp -d)"
trap 'rm -rf "$install_tmp"' EXIT

echo "==> Downloading source"
git clone --depth 1 --quiet "${REPO_URL}" "$install_tmp/fsearch"
cd "$install_tmp/fsearch"

echo "==> Building FSearch"
cargo build --release

echo "==> Installing to ~/.local/bin/fsearch and starting it at login"
./target/release/fsearch install --login

echo
echo "Done. FSearch indexes your disk on first run."
echo "If you changed FSearch Location in Raycast, set it to ~/.local/bin/fsearch to use this installation."
echo
echo "To search protected folders, grant Full Disk Access to ~/.local/bin/fsearch in"
echo "System Settings > Privacy & Security > Full Disk Access (again after each update)."
read -r -p "Open that settings pane now? [y/N] " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
fi
echo "You can close this window and try your search again in Raycast."
`;

/** Opens Terminal to build FSearch from source and install it with startup at login. */
export async function installInTerminal() {
  try {
    await mkdir(environment.supportPath, { recursive: true });
    const scriptPath = join(environment.supportPath, "install-fsearch.command");
    await writeFile(scriptPath, SCRIPT, { mode: 0o700 });
    await chmod(scriptPath, 0o700);
    await open(scriptPath, "com.apple.Terminal");
    await showHUD("FSearch installer opened in Terminal");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't Open FSearch Installer" });
  }
}

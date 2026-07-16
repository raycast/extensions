# SSH Image Drop

Send clipboard images to remote servers over SSH with per-server hotkeys, and pull files back into Finder.

## Why not Terminal Image Paste?

Terminal Image Paste syncs every image to *all* configured hosts and pastes into the focused app.
SSH Image Drop is *target-addressed*: one hotkey per server (via Quicklinks), copies the remote path
to your clipboard, and adds a reverse direction (Pull File from Server). Built for pasting image
paths into remote CLI tools (e.g. Claude Code over SSH).

## Commands

- **Send Clipboard Image** — sends the clipboard image to the server prefilled by a Quicklink, or opens the server picker when launched directly; copies the remote path.
- **Send File to Server** — sends Finder-selected files to a server, and is the shared server picker the other commands fall back to when no host is set. Launched with nothing selected in Finder, it shows usage guidance.
- **Quicklinks** — create per-server hotkeys with Raycast's built-in **Create Quicklink** (on **Send Clipboard Image**), then assign a hotkey in Raycast settings.
- **Pull File from Server** — reads the remote path from the clipboard (Send Clipboard Image puts it there), downloads the file and reveals it in Finder.
- **Add Server** — registers a server. Default: your password is stored in the macOS Keychain (used on each transfer). Optional (checkbox): install an SSH key (`ssh-copy-id`) instead — the password is used **once**, then discarded.

## Authentication & Security

Add Server offers two ways to authenticate, both keeping your password out of plaintext:

- **Keychain (default):** the password is stored in the macOS Keychain (OS-encrypted) and read by an askpass helper on each transfer. Nothing is written to argv, disk in plaintext, LocalStorage, or persistent env.
- **SSH key (opt-in, checkbox):** a dedicated ed25519 key is installed on the server via `ssh-copy-id`; the password is used once (passed via a short-lived FIFO, never on argv) and then discarded — it is not stored locally.

In both modes the password is never placed on a command line (argv), written to disk in plaintext, saved to LocalStorage, or exported to a persistent environment variable. The Keychain default is chosen for convenience — most servers accept password auth immediately.

### Threat model — the boundary is your macOS user account

Anything running **as your macOS user** can already reach these credentials, by design:

- **Keychain passwords** are stored with `-T /usr/bin/security` so the askpass helper can read them without a GUI prompt on each transfer. Trade-off: any process running as your user can likewise run `security find-generic-password -s ssh-image-drop -a <alias> -w` to read a stored password without prompting. Standard login-keychain protections (screen lock, separate accounts, FileVault) still apply.
- **The SSH key** (`~/.ssh/ssh_image_drop_ed25519`) is generated **without a passphrase** and is **shared across all key-mode servers** so transfers run non-interactively. An unencrypted key file is user-equivalent: anyone able to read it as your user can authenticate to every server it was installed on. If it is ever exposed, remove its public key from each server's `authorized_keys`.
- **First connection (TOFU):** the first transfer to a new server trusts its host key automatically (`accept-new`). On a password server, a man-in-the-middle on that *first* connection could capture the password. On untrusted networks, connect once in Terminal (`ssh user@host`) to pin the host key before registering.

Remote paths and filenames containing shell metacharacters or `..` segments are rejected before reaching `scp`.

## Migrating from v1

v2 removes the `host` command argument (host now travels through Raycast launch context) and renames **Send to Server** → **Send File to Server**. **Existing v1 Quicklinks/deeplinks stop working** — recreate them with Raycast's built-in **Create Quicklink** on the relevant command.

## Requirements & notes

- macOS 13+ (relies on OpenSSH 9+ where `scp` uses the SFTP protocol).
- Key-based auth (`BatchMode`) by default; password servers are supported via the Keychain option.
- Reads `~/.ssh/config` locally to list hosts; nothing is sent anywhere except to the SSH server you pick. No telemetry.
- Adds one `Include ~/.ssh/ssh_image_drop_config` line to `~/.ssh/config` (with your consent, after a timestamped backup). Managed servers live only in that file.
- Removing a managed server is manual: delete its `Host` block from `~/.ssh/ssh_image_drop_config` (and, for password servers, its entry in Keychain Access). This does **not** remove the public key already installed in the server's `authorized_keys`.
- First registration accepts the server's host key automatically (`accept-new`).
- Default remote directory is `/tmp/clipboard-images` (cleared on reboot). On shared (multi-user) servers, set a private path in preferences.
- IPv6 literals and interactive password prompts are not supported.

# SSH Image Drop

Send clipboard images, files, and folders to remote servers over SSH with per-server hotkeys, and pull files back into Finder.

## Why it exists

When you run a **Claude Code session on a remote Mac (over SSH)**, you can't paste a screenshot
into it — terminals don't accept an image clipboard paste, and the image lives only on your local
Mac's clipboard where the remote session can't reach it. SSH Image Drop sends the clipboard image
to that remote machine and copies the **remote path** back, so you paste the path into the session
and Claude Code reads the image from disk. It's the fastest way to hand a captured screenshot to a
remote agent, and it works with any terminal — no editor plugin or terminal-specific integration
required. The same one-hotkey flow moves reference files (configs, skill folders) to whichever
server your agent runs on.

## Why not Terminal Image Paste?

Terminal Image Paste syncs every image to *all* configured hosts and pastes into the focused app.
SSH Image Drop is *target-addressed*: one hotkey per server (via Quicklinks), copies the remote path
to your clipboard, and adds a reverse direction (Pull File from Server). Built for pasting image
paths into remote CLI tools (e.g. Claude Code over SSH).

## Commands

- **Send Clipboard Image** — sends the clipboard image to the server prefilled by a Quicklink, or opens the server picker when launched directly; copies the remote path.
- **Send File to Server** — sends Finder-selected files or folders to a server, and is the shared server picker the other commands fall back to when no host is set. Launched with nothing selected in Finder, it shows usage guidance. Folder uploads ask for confirmation; if a folder with the same name already exists on the server, files are copied into it (standard `scp -r` behavior).
- **Quicklinks** — create per-server hotkeys with Raycast's built-in **Create Quicklink** (available on every server row in the picker), then assign a hotkey in Raycast settings.
- **Pull File from Server** — reads the remote path from the clipboard (Send Clipboard Image puts it there), downloads the file — or, after a confirmation, an entire folder — and reveals it in Finder. Paths may start with `/` or `~/`.
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
- **Clipboard staging:** the clipboard image is written to a private temp directory (`mkdtemp`, mode 0700) for the duration of the transfer and deleted immediately afterward — on failure paths too. During that window it is readable by processes running as your user, like any file you own.

**How transfers are gated.** Access is controlled by the *flow* — who you send to and pull from — rather than by inspecting file contents:

- **Every transfer host, including pulls, must be one you already know** — a server registered in Add Server, used recently, listed in `~/.ssh/config`, or added in preferences. Both directions are checked, so a crafted `raycast://` deeplink cannot make the extension talk to an attacker-controlled server. File lists are never accepted from a deeplink; Finder selections are read only at launch.
- **Blast radius is limited**, not file types: pulling `/` or your entire home (`~/`) is refused, and folder transfers ask for confirmation (single files stay one-click). There is intentionally no allow/deny list of "sensitive" filenames — such lists are always incomplete (they miss `.aws/credentials`, `.env`, dumps…) and would break the legitimate use of fetching your own config and keys. Since both ends of a pull are your own machines, a downloaded file is not exfiltrated by the transfer itself.
- **Injection is blocked:** remote paths and filenames containing shell metacharacters, control characters, or `..` segments are rejected before reaching `scp`; `scp` uses the SFTP protocol (no remote shell), and remote commands are single-quote escaped.

**Local exposure after a pull.** A file you pull lands in your Download Directory (default `~/Downloads`). If a crafted deeplink lures you into pulling a sensitive file, it is copied onto *your own* Mac — not sent anywhere — but be aware that folders like `~/Downloads` are often indexed by Spotlight and synced by iCloud/Dropbox, which can become a secondary exposure path. Files are written with the standard SFTP client behavior (no `com.apple.quarantine` attribute), so scripts you fetch from your own servers run without Gatekeeper prompts.

## Migrating from v1

v2 removes the `host` command argument (host now travels through Raycast launch context) and renames **Send to Server** → **Send File to Server**. **Existing v1 Quicklinks/deeplinks stop working** — recreate them with Raycast's built-in **Create Quicklink** on the relevant command.

## Requirements & notes

- macOS 13+ (relies on OpenSSH 9+ where `scp` uses the SFTP protocol).
- Key-based auth (`BatchMode`) by default; password servers are supported via the Keychain option.
- Reads `~/.ssh/config` locally to list hosts; nothing is sent anywhere except to the SSH server you pick. No telemetry.
- Adds one `Include ~/.ssh/ssh_image_drop_config` line to `~/.ssh/config` (with your consent, after a timestamped backup). Managed servers live only in that file.
- Removing a managed server is manual: delete its `Host` block from `~/.ssh/ssh_image_drop_config` (and, for password servers, its entry in Keychain Access). This does **not** remove the public key already installed in the server's `authorized_keys`.
- First registration accepts the server's host key automatically (`accept-new`).
- Default remote directory is `/tmp/ssh-image-drop` (cleared on reboot). On shared (multi-user) servers, set a private path in preferences.
- IPv6 literals and interactive password prompts are not supported.

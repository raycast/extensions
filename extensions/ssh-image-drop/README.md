# SSH Image Drop

Send clipboard images, files, and folders to remote servers over SSH with per-server hotkeys, and pull files back into Finder (Explorer on Windows).

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
- **Send File to Server** — one screen: pick files/folders and the target server, hit Enter to send. On macOS the form is pre-filled with your current Finder selection, so sending what's already selected is a hotkey plus Enter. Also the shared server picker the other commands fall back to when no host is set. Folder uploads ask for confirmation; if a folder with the same name already exists on the server, files are copied into it (standard `scp -r` behavior).
- **Quicklinks** — create per-server hotkeys with Raycast's built-in **Create Quicklink** (available on every server row in the picker), then assign a hotkey in Raycast settings.
- **Pull File from Server** — reads the remote path from the clipboard (Send Clipboard Image puts it there), downloads the file — or, after a confirmation, an entire folder — and reveals it in the file manager. Paths may start with `/` or `~/`.
- **Manage Servers** — add, edit, or delete servers. When adding, your password is stored in the OS credential store by default (macOS Keychain / Windows DPAPI, used on each transfer). Optional (checkbox): install an SSH key instead — the password is used **once**, then discarded.

## Authentication & Security

Adding a server offers two ways to authenticate, both keeping your password out of plaintext:

- **Stored password (default):** the password is kept in the OS credential store — the macOS Keychain, or on Windows a DPAPI-encrypted file (only ciphertext ever touches disk) — and read by an askpass helper on each transfer. Nothing is written to argv, disk in plaintext, LocalStorage, or persistent env.
- **SSH key (opt-in, checkbox):** a dedicated ed25519 key is installed on the server (`ssh-copy-id` on macOS, an equivalent one-line remote install on Windows); the password is used once — passed via a short-lived FIFO on macOS, or a one-time DPAPI-encrypted temp file on Windows — and then discarded, never stored.

In both modes the password is never placed on a command line (argv), written to disk in plaintext, saved to LocalStorage, or exported to a persistent environment variable. The stored-password default is chosen for convenience — most servers accept password auth immediately.

### Threat model — the boundary is your OS user account

Anything running **as your macOS or Windows user** can already reach these credentials, by design:

- **Keychain passwords (macOS)** are stored with `-T /usr/bin/security` so the askpass helper can read them without a GUI prompt on each transfer. Trade-off: any process running as your user can likewise run `security find-generic-password -s ssh-image-drop -a <alias> -w` to read a stored password without prompting. Standard login-keychain protections (screen lock, separate accounts, FileVault) still apply.
- **DPAPI passwords (Windows)** are encrypted per-user (`ConvertFrom-SecureString`) and stored as `cred-<alias>.dpapi` files under the extension's support directory (`%LOCALAPPDATA%\Raycast\extensions\ssh-image-drop\credentials\`). Only ciphertext is on disk, but DPAPI is user-scoped: any process running as your Windows user can decrypt it — the same trade-off as the Keychain entry above. Deleting a server also deletes its file.
- **The SSH key** (`~/.ssh/ssh_image_drop_ed25519`) is generated **without a passphrase** and is **shared across all key-mode servers** so transfers run non-interactively. An unencrypted key file is user-equivalent: anyone able to read it as your user can authenticate to every server it was installed on. If it is ever exposed, remove its public key from each server's `authorized_keys`.
- **First connection (TOFU):** the first transfer to a new server trusts its host key automatically (`accept-new`). On a password server, a man-in-the-middle on that *first* connection could capture the password. On untrusted networks, connect once in Terminal (`ssh user@host`) to pin the host key before registering.
- **Clipboard staging:** the clipboard image is written to a private temp directory (`mkdtemp` — mode 0700 on macOS, user-only default ACL on Windows) for the duration of the transfer and deleted immediately afterward — on failure paths too. During that window it is readable by processes running as your user, like any file you own.

**How transfers are gated.** Access is controlled by the *flow* — who you send to and pull from — rather than by inspecting file contents:

- **Every transfer host, including pulls, must be one you already know** — a server registered in Manage Servers, used recently, listed in `~/.ssh/config`, or added in preferences. Both directions are checked, so a crafted `raycast://` deeplink cannot make the extension talk to an attacker-controlled server. File lists are never accepted from a deeplink; files come only from the picker form you submit — on macOS it is merely pre-filled from your current Finder selection.
- **Blast radius is limited**, not file types: pulling `/` or your entire home (`~/`) is refused, and folder transfers ask for confirmation (single files stay one-click). There is intentionally no allow/deny list of "sensitive" filenames — such lists are always incomplete (they miss `.aws/credentials`, `.env`, dumps…) and would break the legitimate use of fetching your own config and keys. Since both ends of a pull are your own machines, a downloaded file is not exfiltrated by the transfer itself.
- **Injection is blocked:** remote paths and filenames containing shell-active characters (`` ` `` `$` `;` `&` `|` `<` `>` `\` `"` `*` `?`), control characters, or `..` segments are rejected before reaching `scp` — the rejection message names the offending character. Common filename punctuation (brackets, parentheses, braces, `!`, `'`) is allowed, with glob characters backslash-escaped so `scp` treats them literally. `scp` uses the SFTP protocol (no remote shell), and remote commands are single-quote escaped.

**Local exposure after a pull.** A file you pull lands in your Download Directory (default `~/Downloads`). If a crafted deeplink lures you into pulling a sensitive file, it is copied onto *your own* machine — not sent anywhere — but be aware that folders like `~/Downloads` are often indexed by Spotlight and synced by iCloud/Dropbox, which can become a secondary exposure path. Files are written with the standard SFTP client behavior (no `com.apple.quarantine` attribute), so scripts you fetch from your own servers run without Gatekeeper prompts.

## Migrating from v1

v2 removes the `host` command argument (host now travels through Raycast launch context) and renames **Send to Server** → **Send File to Server**. **Existing v1 Quicklinks/deeplinks stop working** — recreate them with Raycast's built-in **Create Quicklink** on the relevant command.

## Requirements & notes

- macOS 13+, or Windows with the built-in OpenSSH client 9.0+ (`C:\Windows\System32\OpenSSH` — Windows 11 ships 9.x; older Windows 10 inbox versions are not supported). Transfers force the SFTP protocol (`scp -s`) and fail closed on OpenSSH builds too old to support it — no silent fallback to the legacy protocol that evaluates remote paths in a shell.
- **Remote servers must run macOS or Linux** (a POSIX shell) — Windows is supported only as the client running this extension.
- Key-based auth (`BatchMode`) by default; password servers are supported via the stored-password option.
- Reads `~/.ssh/config` locally to list hosts; nothing is sent anywhere except to the SSH server you pick. No telemetry.
- Adds one `Include ~/.ssh/ssh_image_drop_config` line to `~/.ssh/config` (with your consent, after a timestamped backup). Managed servers live only in that file.
- Deleting a server from the picker removes its `Host` block and its saved password (Keychain entry / DPAPI file). This does **not** remove the public key already installed in the server's `authorized_keys`.
- First registration accepts the server's host key automatically (`accept-new`).
- Default remote directory is `/tmp/ssh-image-drop` (cleared on reboot). On shared (multi-user) servers, set a private path in preferences.
- Windows client: when pulling an entire *folder*, files inside it whose names are invalid on Windows (reserved device names like `NUL`, or colons) may fail to save — `scp` writes them directly. Pull such files individually; single-file pulls normalize the name automatically.
- IPv6 literals and interactive password prompts are not supported.

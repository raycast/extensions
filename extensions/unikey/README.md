# UniKey

Local-first password vault for Raycast. Your passwords live encrypted in `~/.unikey/vault.enc`, unlock automatically from your macOS Keychain, and get copied or pasted into any app in two keystrokes.

## Features

- **Instant unlock** — the master password is stored in the macOS Keychain. Opening UniKey decrypts the vault silently; no prompts after first setup.
- **Root-search access** — type `unikey` in Raycast, press Enter, start typing a slug.
- **Fuzzy search** powered by [fzf](https://github.com/ajitid/fzf-for-js) — typos still match (`gthb` finds `github`).
- **Field filters**: `pass:` (slug only), `group:`, `meta:` (metadata values), `user:` (username). Space-separated terms are ANDed.
- **Enter = Copy & Paste** — closes Raycast and pastes into the app you were typing in. `⌘C` copies without pasting.
- **Clipboard hygiene** — clipboard auto-clears after 30 seconds (configurable, 0 disables).
- **Groups** — organise passwords into folders; create, rename, delete from the Manage Groups command.
- **Real encryption** — AES-256-GCM whole-file encryption with scrypt key derivation (N=16384). Atomic writes; file mode 0600.

## Setup

1. Install the extension.
2. Run `unikey` in Raycast.
3. Set a master password on first run — it's stored in your Keychain so every later session unlocks automatically.

If you ever need to re-lock, use the "Lock Vault" action (⌘L) on any entry.

## Vault location

Default is `~/.unikey/vault.enc`. Change it in extension preferences if you want to sync the file yourself (e.g. via iCloud Drive or git-crypt). The file is fully self-contained AES-GCM ciphertext.

## Privacy

Everything stays on your machine. No network calls, no telemetry, no accounts. The only outbound interaction is reading/writing your own macOS Keychain item named `UniKey Master Password`.

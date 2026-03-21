# SSH Key Manager

Generate, audit, and manage your local SSH keys and `~/.ssh/config` directly from Raycast.

## Features

- List SSH keys from `~/.ssh`
- Generate new SSH keys (file or hardware-backed algorithms)
- Inspect and manage SSH config host entries
- Connect to hosts from Raycast using your preferred terminal emulator
- Audit keys for common issues:
  - Missing passphrases
  - Unsafe file permissions
  - Orphaned key files
  - Duplicate fingerprints

## Commands

### List SSH Keys

- View detected SSH keys
- Copy public keys and fingerprints
- Rename keys
- Reveal key files in Finder
- Delete keys (with confirmation, under Danger Zone)

### Generate SSH Key

- Choose storage mode and algorithm
- Set filename, comment, and optional passphrase
- Copy the generated public key
- Reveal generated key in Finder

### Manage SSH Config

- View and edit `~/.ssh/config` host entries
- Create new host entries
- Connect to hosts directly from Raycast
- Open `~/.ssh/config` in your editor
- Delete entries (with confirmation, under Danger Zone)

### Audit SSH Keys

- Scan for common SSH key security issues
- Fix permissions when applicable
- Set passphrase for unprotected private keys
- Remove orphan key files (with confirmation, under Danger Zone)

## SSH Connect Terminal Preference

In the **Manage SSH Config** command preferences, set your terminal emulator:

- Terminal.app
- iTerm2
- Alacritty
- WezTerm
- Kitty
- Custom command (with `{{command}}` placeholder)

## Notes

- This extension operates on files in your local `~/.ssh` directory.
- Deletion actions are grouped under **Danger Zone** and require confirmation.
- For store screenshots and listing assets, upload them in the Raycast extension dashboard after publish.

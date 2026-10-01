# Proton Pass

Search and manage your Proton Pass items directly from Raycast.

## Project Notes

- This extension is maintained as an independent `proton-pass` implementation.
- It uses local `pass-cli` execution, local caching, and command-specific flows implemented in this repository.

## Setup

This extension requires the Proton Pass CLI (`pass-cli`) to be authenticated.

### 1. CLI Installation (Automatic)

The extension automatically downloads and installs the Proton Pass CLI on first use. No manual installation required!

If you prefer to install manually on macOS, you can use Homebrew:

```bash
brew install protonmail/proton/pass-cli
```

Or download from [Proton Pass CLI Documentation](https://protonpass.github.io/pass-cli/).

### 2. Authenticate

Run the login command in your terminal:

```bash
pass-cli login
```

This uses web login by default: `pass-cli` prints a URL, you complete authentication in your browser, and the session is saved locally.

Optional: use terminal prompts with interactive login:

```bash
pass-cli login --interactive user@proton.me
```

### 3. Verify

Test that the CLI is working:

```bash
pass-cli vault list
```

## Preferences

- **CLI Path**: Path to the `pass-cli` executable (defaults to `pass-cli` in PATH)
- **Default Password Length**: Length for generated passwords (default: 20)
- **Default Password Type**: Random characters or memorable passphrase
- **Transient Clipboard**: Keep copied passwords and 2FA codes out of Raycast's clipboard history
- **Primary Action**: What Enter does on a login: copy the password (default), or fill the login (macOS)
- **Submit After Filling**: Press Return after filling the password (off by default)
- **Background Refresh**: Automatically refresh cached vault and item data
- **Cache Expiration**: How long cached metadata is considered fresh (5 minutes, 1 hour, 5 hours, 1 day, 7 days, or 30 days; default 5 minutes). Older data is still shown instantly while it refreshes in the background
- **Web Integration**: Auto-select items that match your active browser tab URL (requires Raycast web extension access)
- **Website Icons**: Show website icons for logins instead of their initials. Icons come from the favicon provider set in Raycast's settings, which receives the website domains (off by default)

## Filling Logins (macOS)

**Fill Login** closes Raycast and fills the login of the app you were using: it pastes the email (or the username when the item has no email), presses Tab and pastes the password. Put the cursor in the first field of the login form before opening Raycast. If the item has a 2FA code, the code is then left in the clipboard, ready to paste on the next screen.

For logins split over several screens, use **Paste Email**, **Paste Username**, **Paste Password** and **Paste 2FA Code** instead.

Values go through the clipboard marked as concealed, so clipboard history skips them, and the previous clipboard is restored afterwards. The first time, macOS asks to allow Raycast to control System Events, and Raycast needs Accessibility access (System Settings › Privacy & Security).

To fill with Enter, set **Primary Action** to _Fill Login_.

## Troubleshooting

### Keyring Access Issues

If you see keyring-related errors, try:

```bash
pass-cli logout --force
export PROTON_PASS_KEY_PROVIDER=fs
pass-cli login
```

On Windows, if session persistence through Windows Credential Manager reports a `keyring_error`, retry from PowerShell:

```powershell
pass-cli logout --force
$env:PROTON_PASS_KEY_PROVIDER = "fs"
pass-cli login
```

### CLI Not Found

If the CLI is installed but not detected, set the full path in extension preferences:

```
/opt/homebrew/bin/pass-cli
```

### Re-download CLI

If the auto-installed CLI becomes corrupted or you want to force a re-download, use the "Clear CLI Cache" action available in the error screens.

## Platform Verification

Run on Windows x86_64 from this extension directory:

```powershell
npm ci; if ($LASTEXITCODE) { exit $LASTEXITCODE }; npm test; if ($LASTEXITCODE) { exit $LASTEXITCODE }; npx tsc --noEmit
```

Then verify a fresh automatic install keeps `pass-cli.exe` beside `libcrypto-3-x64.dll`, browser login persists through Windows Credential Manager (or shows the documented `keyring_error` guidance), search/copy/TOTP work, shortcuts display Ctrl-based keys, and Browser Extension plus Terminal fallback actions stay absent.

Run on macOS:

```bash
npm ci && npm test && npm run lint && npm run build
```

Then verify a fresh install passes Gatekeeper after chmod/quarantine removal, browser re-login works with CLI 2.3.3, and all commands complete a smoke test. Sessions from CLI 1.4.1 may require login again.

# Switcheroo

Manage your Switcheroo keyboard remapper configuration from Raycast.

## Daemon dependency

This extension requires the [Switcheroo daemon](https://github.com/mitchelljphayes/switcheroo)
to be installed and running.

### Install via Homebrew (recommended)

```bash
brew tap mitchelljphayes/switcheroo
brew install switcheroo
brew services start switcheroo
```

### Build from source

See the [repository README](https://github.com/mitchelljphayes/switcheroo#install)
for source-build instructions.

## Accessibility permission

Switcheroo requires macOS Accessibility permission to intercept
keyboard events via `CGEventTap`. After installing the daemon:

1. System Settings → Privacy & Security → Accessibility
2. Add the Switcheroo app:
   - Homebrew: `$(brew --prefix switcheroo)/Switcheroo.app`
   - Standalone: `~/.local/bin/Switcheroo.app`

> **Note:** ad-hoc signing means Accessibility permission may need
> re-granting after each `brew upgrade` or rebuild.

## Service layouts

The extension supports both install layouts:

- **Homebrew** (`brew services`): label `homebrew.mxcl.switcheroo`,
  restarted via `launchctl kickstart -k`.
- **Standalone** (`install.sh`): label
  `com.mitchelljphayes.switcheroo`, restarted via `launchctl bootout`
  + `bootstrap`.

The extension auto-detects which layout is active and refuses to
restart a foreign/ambiguous job. If neither is running, it shows an
actionable error with install instructions.

## Commands

- **View Remaps** — View and manage all keyboard remapping rules
- **Add Remap** — Add a new keyboard remapping rule
- **Restart Switcheroo** — Restart the Switcheroo service
- **View Logs** — View recent Switcheroo log output
- **Edit Config** — Open Switcheroo config in your default editor

## Development

```bash
npm install
npm run dev
```

### Linting

This extension has two lint tiers:

- **`npm run lint:ci`** — local code-quality gate (ESLint + Prettier on
  `src/**`). Used by CI and for everyday development. No network access.
- **`npm run lint`** (i.e. `ray lint`) — full Raycast Store validation.
  This additionally validates `package.json` metadata (schema, icons) and
  performs an **external Store-author API check** against
  `https://www.raycast.com/api/v1/users/<author>`. The `author` field must
  be a registered Raycast Store author handle (not a display name) for
  this check to pass. Run this before submitting to the Raycast Store;
  it is intentionally not part of CI so local development and PRs are not
  blocked on the external API.
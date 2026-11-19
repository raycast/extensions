# Switcheroo

Manage your Switcheroo keyboard remapper configuration from Raycast.

**Store status:** [submission #31064](https://github.com/raycast/extensions/pull/31064) is awaiting Raycast review. There is no Store install yet. For local use, see [Local install before Store approval](#local-install-before-store-approval).

## Set up the daemon first

The extension edits configuration and requests service restarts. The separate [Switcheroo daemon](https://github.com/mitchelljphayes/switcheroo) performs the remapping. Installing one does not install the other, and you can use the daemon without Raycast.

If you already have a standalone daemon, follow the [migration guide](https://github.com/mitchelljphayes/homebrew-switcheroo#migrating-from-the-standalone-install-caution) before starting a Homebrew service. Never run both providers at once.

### 1. Install via Homebrew

```bash
brew tap mitchelljphayes/switcheroo
brew install switcheroo
```

### 2. Create or keep your config

The active file is `~/.config/switcheroo/config.toml`. This creates a sample only when no existing file or symlink is present:

```bash
mkdir -p "$HOME/.config/switcheroo"
config="$HOME/.config/switcheroo/config.toml"
if [ ! -e "$config" ] && [ ! -L "$config" ]; then
  cp "$(brew --prefix)/etc/switcheroo/config.toml" "$config"
fi
open -e "$config"
```

Review the sample before enabling it—it changes keyboard behavior. Existing configs are not overwritten.

### 3. Grant Accessibility permission

Run `echo "$(brew --prefix switcheroo)/Switcheroo.app"` to get the app path. In **System Settings → Privacy & Security → Accessibility**, click **+**, use **⌘⇧G** to navigate to that path, add `Switcheroo.app`, and enable access.

For a standalone install, the app is at `~/.local/bin/Switcheroo.app`. Grant permission to the daemon app, not just Raycast.

> **Note:** ad-hoc signing means Accessibility permission may need
> re-granting after each `brew upgrade` or rebuild.

### 4. Start and verify

```bash
brew services start switcheroo
brew services info switcheroo
switcheroo --version
```

Test a configured mapping before opening the extension. For standalone builds, use the [source installation guide](https://github.com/mitchelljphayes/switcheroo#install) instead of Homebrew service commands.

## Service layouts

The extension supports both install layouts:

- **Homebrew** (`brew services`): label `homebrew.mxcl.switcheroo`,
  restarted via `launchctl kickstart -k`. This is the pre-existing
  Homebrew lifecycle managed by `brew services`.
- **Standalone** (`install.sh`): label
  `com.mitchelljphayes.switcheroo`. When loaded, the extension requests
  a graceful `launchctl kill SIGTERM` (the daemon handles SIGTERM to
  clean up kernel-level mappings) and verifies the plist has
  `KeepAlive=true` so launchd relaunches the daemon automatically.
  The UI reports "Restart requested" — relaunch is asynchronous and
  not polled or guaranteed. When absent, the extension bootstraps
  the daemon from the verified plist. The extension verifies the
  plist identity before restarting and refuses ambiguous or foreign jobs.

The extension auto-detects which layout is active and refuses to
restart a foreign/ambiguous job. If neither is running, it shows an
actionable error with install instructions.

## Commands

- **View Remaps** — View and manage all keyboard remapping rules
- **Add Remap** — Add a new keyboard remapping rule
- **Restart Switcheroo** — Restart the Switcheroo service
- **View Logs** — View recent Switcheroo log output
- **Edit Config** — Open Switcheroo config in your default editor

## Local install before Store approval

Requires Raycast and Node.js/npm. The latest submitted extension is on the PR's fork branch; it may be ahead of the copy in the daemon repository:

```bash
git clone --depth 1 --filter=blob:none --sparse --branch ext/switcheroo https://github.com/mitchelljphayes/raycast-extensions.git switcheroo-raycast
cd switcheroo-raycast
git sparse-checkout set extensions/switcheroo
cd extensions/switcheroo
npm ci
npm run dev
```

When the build finishes, open **View Remaps** in Raycast. Stop the development watcher with **Ctrl+C** when done; the built extension remains available, and the daemon keeps running independently. Start the watcher again only when developing.

Once Raycast approves the Store submission, install the Store version and remove any duplicate local development entry in **Raycast Settings → Extensions**.

## Troubleshooting

- **Missing executable:** rebuild/import the local extension with `npm run dev` from the extension directory. Homebrew installs the daemon, not Raycast's compiled commands.
- **No remaps or a config error:** check the active TOML path and use **Edit Config**. The submitted editor deliberately refuses unsupported TOML edits instead of discarding comments or unknown settings.
- **Saved, but restart failed:** the config change is already saved. Fix the service/permission issue and use **Restart Switcheroo**; do not repeatedly add the same rule.
- **Duplicate commands:** stop extra watchers and check for duplicate local registrations. Removing a Raycast extension does not uninstall the daemon or remove the active TOML file.
- **Keys do not change:** check service status and the daemon's Accessibility permission. Runtime logs are in `~/Library/Logs/com.mitchelljphayes.switcheroo/`.

## Update or remove

For the Homebrew daemon, use `brew update`, `brew upgrade switcheroo`, then `brew services restart switcheroo`. Recheck Accessibility permission after an upgrade. To uninstall, stop it with `brew services stop switcheroo` before `brew uninstall switcheroo`. See the [tap README](https://github.com/mitchelljphayes/homebrew-switcheroo#readme) for migration and recovery cautions.

Removing the Raycast UI in **Settings → Extensions** is separate from stopping or uninstalling the daemon. Keep your config if you plan to reinstall.

## Development

From an existing extension checkout, use `npm ci` and `npm run dev`. Run `npm run build` to validate a distribution build.

### Linting

This extension has two lint tiers:

- **`npm run lint:ci`** — local code-quality gate (ESLint + Prettier on
  `src/**`). Used by CI and for everyday development. No network access.
- **`npm run lint`** (i.e. `ray lint`) — full Raycast Store validation.
  This additionally validates `package.json` metadata (schema, icons) and
  performs an **external Store-author API check** against
  `https://www.raycast.com/api/v1/users/<author>`. The `author` field must
  be a registered Raycast Store author handle (not a display name) for
  this check to pass. Run it before submitting to the Raycast Store; Store
  submission CI also runs the full check.

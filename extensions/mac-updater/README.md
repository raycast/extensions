# Mac Updater

> One place to find and apply every update on your Mac.

Mac Updater scans every app and package on your Mac across ten update channels — Homebrew, the Mac App Store, Sparkle, Electron-based apps, GitHub releases, npm, pip, Ruby gems, and more — then updates them in place. Nothing runs without your click.

## What it does

- **Catches updates everywhere.** Most apps update through their own private system. Mac Updater asks all of them at once and shows you a single, sorted list.
- **Updates in place.** Hit Return to download and swap an app over its existing copy. Atomic, with code-signature verification and rollback on failure.
- **Adopts orphan apps to Homebrew.** Found an app you installed from a DMG that also exists as a `brew install --cask`? One key adopts it so future updates flow through brew.
- **Quiet by default.** Snooze updates for 1–90 days or hide them forever. A `Hidden` view lets you reverse either.
- **Passive monitoring.** A menu bar icon shows the pending count without you having to open Raycast.
- **Background auto-update.** Opt in and brew quietly runs every 12 hours. Logged to history.

## Commands

| Command | What it does |
|---|---|
| **Mac Updater** | The main view. Browse, inspect, and update individual apps. Multi-select with `Space`. |
| **Update Everything** | One queue across all sources with per-app progress + cancel + per-step timeout. |
| **Mac Updater Menu Bar** | Passive update count in the macOS menu bar. Refreshes every hour. |
| **Auto-Update in Background** | Opt-in. Silent brew + (optional) MAS upgrades every 12 hours. Configurable via command preferences. |

## Sources covered

| Source | How it's detected |
|---|---|
| 🍺 **Homebrew Casks** | Direct scan of `/opt/homebrew/Caskroom` (Apple Silicon) or `/usr/local/Caskroom` (Intel). |
| 🍺 **Homebrew Formulae** | Scan of the equivalent `Cellar/`, plus `brew outdated`. |
| 🛒 **Mac App Store** | `_MASReceipt` presence + iTunes Lookup API. `mas` CLI for the upgrade. |
| ✨ **Sparkle** | `SUFeedURL` in `Info.plist` → fetched and parsed. Handles both attribute- and element-form feeds. Falls back to DevMate when Sparkle isn't wired. |
| ⚡ **Electron** | Detected via `Electron Framework.framework`. Known update endpoints for VS Code / Cursor / Codium / Windsurf / Slack / Discord. |
| 🐙 **GitHub Releases** | When `SUFeedURL` points at github.com, queries `api.github.com/repos/{o}/{r}/releases/latest`. |
| 🌐 **npm globals** | `npm ls -g --depth=0` + `npm outdated -g`. |
| 🐍 **pip** | `pip list` + `pip list --outdated`. |
| 💎 **Ruby gems** | Prefers Homebrew Ruby; skips the macOS system Ruby (which needs `sudo`). |

For apps that don't expose any of these, the **No Source** view offers three ways to wire one up by hand:

- **`⌘K` Adopt with custom cask** — type a cask token, the mapping is saved.
- **`⌘⇧M` Search Mac App Store** — live iTunes Search lookup; pick a match to save.
- **`⌘J` Wire up a Sparkle feed** — paste a feed URL, test it live, save it.

User-defined mappings persist across runs and apply on every future scan.

## Privacy

Mac Updater never sends your data anywhere. It does talk to a handful of public services to look up update information:

- `formulae.brew.sh` — Homebrew cask catalog (cached on disk for 6 hours)
- `itunes.apple.com/lookup` and `itunes.apple.com/search` — App Store metadata
- `api.github.com/repos/.../releases/latest` — for apps with a GitHub release feed
- Each Sparkle-enabled app's own appcast URL
- Each Electron app's official update endpoint (VS Code, Slack, etc.)

No analytics. No telemetry. No external account. Everything is stored locally in your Raycast extension support folder.

## Installation

This is a Raycast extension. Install Raycast from [raycast.com](https://www.raycast.com/), then add the extension from the Raycast Store (or import this folder via Settings → Extensions → Add Script Directory during development).

Mac Updater works best with [Homebrew](https://brew.sh) installed. On first launch, if Homebrew isn't detected, the extension offers a one-click Terminal install.

## Keyboard shortcuts

Press `⌘/` from any app in the main view to see the full reference. The short version:

- `⏎` update the focused item · `Space` add to multi-select
- `⌘⇧U` update everything · `⌘⇧A` adopt all to Homebrew
- `⌘R` refresh · `⌘⇧R` force rescan (ignore cache)
- `⌘D` toggle detail · `⌘N` open release notes · `⌘⇧.` copy bundle ID
- `⌘⇧S` snooze · `⌘⇧I` hide forever · `⌘⇧⌫` don't suggest adoption
- `⌘K` custom cask · `⌘J` Sparkle feed · `⌘⇧M` App Store search

## How updates work

- **Homebrew + Mac App Store** updates run silently via `brew upgrade` / `mas upgrade`.
- **Sparkle / Electron / GitHub** apps are updated by downloading the official build, verifying its code signature, and atomically swapping it into `/Applications`. The old app is backed up first and rolled back if signature verification fails.
- For apps without a downloadable URL in their feed, Mac Updater opens the app so its own auto-updater can complete the work.
- If brew or a third-party tap is broken upstream, the extension surfaces the actual error and offers a one-click "Run in Terminal" or "Open Project Page" escape hatch.

## Troubleshooting

**"Out of memory" or "Command Out of Memory"** — Should not happen in 1.0+ (we slimmed the cask index from ~60MB to ~1.5MB resident). If it does, please file an issue.

**Adoption fails with `mas install`** — `mas install` only works if the app is already in your Apple ID's Purchased list. Click "Open in App Store" instead, get the app once, then retry.

**An app you know has Sparkle shows under "No Source"** — Press `⌘J` to wire up its feed manually. The mapping is saved.

**A brew cask returns 404 on install** — That's a third-party tap with a stale download URL — the maintainers need to refresh it. Mac Updater detects this and offers the project's homepage as a fallback.

**First-time scan is slow** — It downloads the 15MB Homebrew cask catalog. Subsequent scans use the on-disk cache (instant).

## Contributing

The codebase is small and modular. Tests live under `tests/`:

```
npm test       # 14 tests covering version comparison, Sparkle parsing, HTML rendering
npm run build  # type-check + bundle
npm run lint   # raycast lint
```

Curated install mappings live in `src/utils/known-installs.ts`. PRs adding entries for third-party taps or MAS-only apps are very welcome.

## License

MIT. See `LICENSE`.

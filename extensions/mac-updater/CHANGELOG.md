# Mac Updater Changelog

## [1.0.0] - {PR_MERGE_DATE}

Initial public release.

### Commands
- **Mac Updater** — browse, inspect, and update every app and package across ten sources. Multi-select with `Space`.
- **Update Everything** — single queue with live per-app progress, cancel, and per-step timeout.
- **Mac Updater Menu Bar** — passive update count in the macOS menu bar (refreshes every hour).
- **Auto-Update in Background** — opt-in scheduled brew + MAS upgrades (default 12h interval, configurable via command preferences).

### Sources covered
- Homebrew casks (Apple Silicon + Intel paths)
- Homebrew formulae
- Mac App Store (via `_MASReceipt` + iTunes Lookup API)
- Sparkle feeds (both attribute and element-form XML)
- Electron apps (VS Code, Cursor, Codium, Windsurf, Slack, Discord)
- GitHub releases (via Sparkle feed hints to github.com)
- DevMate fallback
- npm globals
- pip
- Ruby gems (Homebrew Ruby or rbenv/asdf — skips macOS system Ruby)

### Adoption flows
- One-click adopt to Homebrew when a cask matches an installed app.
- Bulk adopt with cancel + per-step timeout.
- `⌘K` custom cask mapping for unknown apps.
- `⌘⇧M` live Mac App Store search to discover correct store IDs.
- `⌘J` Sparkle feed wire-up with live "test feed" before save.
- Curated registry of known third-party taps (with a `disabled` flag for upstream-broken casks like KDE Connect).

### Quality of life
- First-run onboarding (2 screens) when Homebrew is installed; install-Homebrew prompt when it isn't.
- Snooze for 1 / 7 / 30 / 90 days.
- Permanent hide forever.
- Don't-suggest-adoption (independent of hide).
- Update history log (last 500 entries, bucketed by day).
- Detail panel with app icon, install size, last-modified, and full HTML-to-Markdown release notes.
- `⌘/` opens an in-extension help reference for every shortcut.

### Reliability + correctness
- Atomic in-place app swap with code-signature verification and automatic rollback.
- Admin escalation via `osascript` when mas/brew needs sudo.
- Self-healing disk caches (corrupt files are auto-deleted and re-fetched).
- Graceful fallback when Homebrew or `/Applications` is missing.
- Aggressive but accurate cask matching (no false-positives for `-beta` / `-canary` apps).
- Memory footprint kept under 2MB for the cask catalog (down from ~60MB) — fits comfortably in Raycast's 100MB per-command JS heap.
- 14 unit tests covering version comparison + Sparkle parsing + HTML rendering.

### Privacy
- No analytics, no telemetry, no remote account.
- External requests limited to: `formulae.brew.sh`, `itunes.apple.com`, `api.github.com`, each app's own Sparkle feed, and each Electron app's official update endpoint.
- All state stored locally in the Raycast extension support folder.

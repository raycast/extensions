<div align="center">

<div>
    <img src="./assets/extension-icon.png" alt="App Updates" width="128" height="128" />
</div>

# App Updates

</div>

Check for available updates of your installed macOS apps. Scans three sources:

- **Sparkle** — Reads `SUFeedURL` from each app's `Info.plist` and checks the appcast feed for newer versions
- **Homebrew Cask** — Runs `brew outdated --cask` to find cask-installed apps with updates
- **Mac App Store** — Runs `mas outdated` to find App Store apps with updates (requires [mas](https://github.com/mas-cli/mas))

## Commands

- **Check Updates** — Scan all installed apps and list those with available updates. For Homebrew apps, you can run `brew upgrade` directly from the action panel
- **Updates Menu Bar** — Persistent menu bar icon showing the number of available updates, refreshes every hour
- **Brew Maintenance** — Daily automated Homebrew maintenance (update, upgrade, doctor, cleanup) with results shown in the menu bar
- **Doctor Advice** — AI-powered explanations and fix suggestions for `brew doctor` warnings (requires Raycast Pro)

## Features

- Shows app icon, name, current version, and available version
- Groups results by source (Sparkle, Homebrew, App Store)
- Run `brew upgrade --cask` directly from the action panel
- Menu bar icon with update count badge and quick access to outdated apps
- Daily Brew Maintenance with configurable steps and visual report
- AI-powered Doctor Advice: explains each `brew doctor` warning, rates severity, suggests fix commands, and provides a summary with all commands grouped for easy copy
- Automatic progress indicator during Sparkle feed scanning

## Brew Maintenance

The Brew Maintenance command runs automatically once per day and shows the results in the menu bar:

- Color-coded status icon (green = all good, yellow = doctor warnings, red = errors)
- Detailed report: which steps ran, what was upgraded, doctor warnings, timing
- "Run Now" action to force an immediate run
- Fully configurable via command preferences:
  - `brew update` — update formulae index (default: on)
  - `brew upgrade` — upgrade formulae (default: on)
  - `brew upgrade --cask` — upgrade GUI apps (default: off)
  - `brew doctor` — check for issues (default: on)
  - `brew cleanup` — remove old versions (default: off)

## Requirements

- **Homebrew** (optional) — for Homebrew Cask update detection and Brew Maintenance
- **mas** (optional) — for Mac App Store update detection (`brew install mas`)
- **Raycast Pro** (optional) — required for the AI-powered Doctor Advice command

The extension works even without Homebrew or mas installed — it will simply skip those sources and show a guided prompt to install them.

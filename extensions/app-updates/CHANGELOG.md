# App Updates Changelog

## [Initial Version] - 2026-05-06

- Scan installed apps for available updates via three sources: Sparkle, Homebrew Cask, and Mac App Store
- Display app icon, name, current and latest version grouped by source
- Run `brew upgrade --cask` directly from the action panel for Homebrew apps
- Menu bar command with update count badge, refreshes every hour
- Brew Maintenance: daily automated `brew update`, `brew upgrade`, `brew doctor`, `brew cleanup` with configurable steps
- Brew Maintenance menu bar shows color-coded status, detailed report, upgraded packages, and doctor warnings
- Doctor Advice: AI-powered explanations, severity ratings, fix commands, and summary with all commands grouped
- Click on a doctor warning to copy the fix command
- Progress indicator during Sparkle appcast feed scanning
- Guided setup: prompts to install Homebrew or mas when missing, with one-click copy of install commands
- Scans both `/Applications` and `~/Applications`

# Changelog

All notable changes to **miccast** are documented here. The 1.0.0 entry is
curated; subsequent entries are appended automatically by the release workflow
(`.github/workflows/release.yml`) from the commit messages in each release.

<!-- new-release-anchor -->

## [1.0.0] - 2026-06-26

- **Set Input Device** — switch the active microphone from a searchable list;
  the current device is marked so you always see what's selected.
- **Set Output Device** — switch the active speaker/headphone output the same
  way.
- Instant switching with a confirmation toast (“Now using: …”) and the window
  closes automatically.
- Each device row and command shows a microphone or speaker icon that adapts to
  Raycast's light and dark themes.
- Works out of the box on macOS — no Homebrew or extra tools to install; the
  CoreAudio helper ships inside the extension.

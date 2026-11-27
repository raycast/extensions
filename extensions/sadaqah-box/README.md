<h1 align="center"><img align="left" src="assets/extension-icon.png" width="48" alt="Sadaqah Box icon"><a href="https://erklab.com"><picture><source media="(prefers-color-scheme: dark)" srcset="media/erklab-logo-white.svg"><img align="right" src="media/erklab-logo.svg" width="112" alt="erklab"></picture></a>Sadaqah Box</h1>

<p align="center"><strong>Track your charity boxes and sadaqahs directly from Raycast.</strong><br>
Multi-currency support, quick-add presets, and automatic gold value conversion.</p>

<p align="center"><strong>Sponsored by <a href="https://erklab.com">erklab</a></strong> — Architecting production-grade systems with AI-driven velocity and human-centered precision.<br>
<sub>Available for macOS &amp; Windows.</sub></p>

<!-- /header -->

## Demo

<div align="center">
  <img src="media/demo.gif" alt="Sadaqah Box Demo" width="720">
</div>

---

## Features

### Box Management
- **Create & Edit Boxes**: Organize your sadaqahs into dedicated boxes (e.g., "Ramadan Charity", "Daily Sadaqah") with a name, optional description, and base currency (defaults to Gold `XAU`).
- **Track Progress**: Monitor total value, sadaqah count, and extra currency breakdowns for each box.
- **Multi-Currency Support**: Record donations in any supported currency with automatic conversion into your box's base currency.

### Quick Actions & Presets
- **Presets**: Save common sadaqah amounts and currencies for one-click recording.
- **Default Preset**: Star a preset as your default so it becomes the primary action on every box in the Dashboard.
- **Keyboard Shortcuts**: Quickly trigger your top 5 presets directly from any box.

### Statistics & Collection Receipts
- **Dashboard Overview**: View total boxes, sadaqahs, and converted total value at a glance.
- **Collection Receipts**: Collect (empty) a box to generate a summary receipt with converted values and an inspirational Quranic verse or Hadith.
- **Collection History**: Review past collections and individual sadaqah entries inside any box.

## Setup & Preferences

Before using the extension, configure your preferences in **Raycast Settings → Extensions → Sadaqah Box**:

| Preference | Description | Default | Required |
| --- | --- | --- | --- |
| **API Host** | Base URL of your SadaqahBox API | `https://live.sadaqahbox.apps.erklab.com` | Yes |
| **API Key** | Your Better Auth API key | — | Yes |

### Getting an API Key
1. Sign in to your SadaqahBox web application.
2. Go to **Settings → API Keys**.
3. Create a new API key and paste it into the **API Key** preference in Raycast.

## Commands & Shortcuts

### Dashboard
View and manage all of your sadaqah boxes:
- **Open Box**: Inspect individual sadaqahs, collection history, and box stats.
- **Add Sadaqah**: Enter a per-item value and optional multiplier amount (1–1,000), summed into a single entry.
- **Quick-Add Presets**: `⌘⇧1`–`⌘⇧5` (macOS) / `Ctrl+Shift+1`–`Ctrl+Shift+5` (Windows).
- **Edit Box**: `⌘E` (macOS) / `Ctrl+E` (Windows).
- **Collect Box**: `⌘O` (macOS) / `Ctrl+O` (Windows).
- **Delete Box**: `⌘⇧D` (macOS) / `Ctrl+Shift+D` (Windows).

### Box Details
- **Delete Sadaqah**: `⌘⌫` (macOS) / `Ctrl+Backspace` (Windows).
- **Next / Previous Sadaqahs Page**: `⌘→` / `⌘←` (macOS) / `Ctrl+→` / `Ctrl+←` (Windows).
- **Next / Previous Collections Page**: `⌘⇧→` / `⌘⇧←` (macOS) / `Ctrl+Shift+→` / `Ctrl+Shift+←` (Windows).

### Manage Presets
Configure quick-add presets for faster recording:
- Create, edit, and delete presets with name, unit value, multiplier count (1–1,000), and currency.
- Set or unset a default preset for the Dashboard's primary action.
- **Reorder Presets**: `⌘⌥↑` / `⌘⌥↓` (macOS) / `Ctrl+Alt+↑` / `Ctrl+Alt+↓` (Windows).

## Troubleshooting

- **"API Key is not configured"**: Open Raycast Extension Preferences for **Sadaqah Box** and verify your API key is entered without extra spaces.
- **"Invalid API Host URL format"**: Ensure **API Host** starts with `https://` or `http://` (for example, `https://live.sadaqahbox.apps.erklab.com`).
- **"Request timed out" or connection errors**: Check your internet connection and verify your SadaqahBox server is reachable.

## Acknowledgments

- Sponsored by [erklab](https://erklab.com)
- Quranic verses and Hadith included for inspiration
- Built with [Raycast](https://www.raycast.com/) and [Better Auth](https://www.better-auth.com/)

## License

MIT License — see [LICENSE](LICENSE) for details.

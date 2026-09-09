# Dated Folder

Create a folder named after today's date (for example `2026-08-28`) inside a folder of your choice, then open it straight in your terminal. Handy for scratch work, downloads triage, daily notes, or anything you want grouped by day.

## Usage

Run **Create Dated Folder**. That is it — the folder is created (or reused if it already exists), a terminal window opens inside it, and a HUD confirms the path.

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| **Parent Folder** | `Desktop/temp` | Where dated folders are created. It is created on first run if missing. |
| **Terminal** | System default | Any installed app. When empty, macOS follows the terminal registered as the default handler for shell scripts — the setting apps like Ghostty, iTerm2, and Warp write when you accept "make this your default terminal" — and falls back to Terminal.app. |
| **Folder Name Format** | `yyyy-MM-dd` | Tokens: `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`. Wrap words in single quotes to keep them literal, e.g. `'summer'-yyyy` → `summer-2026`. Use `/` to nest, e.g. `yyyy/MM/dd` creates `2026/08/28`. The result must stay inside the parent folder. |
| **Reveal** | Off | Also reveal the folder in Finder. |

## Notes

- **Folder name format** — tokens are expanded wherever they appear, so quote any word that contains one: `'add'-yyyy` rather than `add-yyyy`, which would otherwise read `dd` as the day. `''` produces a single quote.
- **Terminal** — the folder is opened with the chosen app via `open`, so any terminal that accepts a folder works (Terminal, iTerm2, Ghostty, Warp, kitty, WezTerm, …).

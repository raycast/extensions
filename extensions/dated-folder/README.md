# Dated Folder

Create a folder named after today's date (for example `2026-08-28`) inside a folder of your choice, then open it straight in your terminal. Handy for scratch work, downloads triage, daily notes, or anything you want grouped by day.

## Usage

Run **Create Dated Folder**. That is it — the folder is created (or reused if it already exists), a terminal window opens inside it, and a HUD confirms the path.

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| **Parent Folder** | `Desktop/temp` | Where dated folders are created. It is created on first run if missing. On Windows the real Desktop location is used, even when OneDrive or a policy has moved it. |
| **Terminal** | System default | Any installed app. When empty, macOS follows the terminal registered as the default handler for shell scripts — the setting apps like Ghostty, iTerm2, and Warp write when you accept "make this your default terminal" — and falls back to Terminal.app. Windows uses Windows Terminal when installed, otherwise Windows PowerShell. |
| **Folder Name Format** | `yyyy-MM-dd` | Tokens: `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`. Use `/` to nest, e.g. `yyyy/MM/dd` creates `2026/08/28`. The result must stay inside the parent folder. |
| **Reveal** | Off | Also reveal the folder in Finder / File Explorer. |

## Notes

- **macOS** — the folder is opened with the chosen app via `open`, so any terminal that accepts a folder works (Terminal, iTerm2, Ghostty, Warp, kitty, WezTerm, …).
- **Windows** — Windows Terminal is launched with `-d <folder>`; other apps and shells are started with the folder as their working directory. The code is in place but has not been verified on a real Windows machine yet, so the extension currently declares macOS only.

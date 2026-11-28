# Dated Folder

Create a folder named after today's date (for example `2026-08-28`) inside a folder of your choice, then open it straight in your terminal. Handy for scratch work, downloads triage, daily notes, or anything you want grouped by day. Works on macOS and Windows.

## Usage

Run **Create Dated Folder**. That is it — the folder is created (or reused if it already exists), a terminal window opens inside it, and a HUD confirms the path.

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| **Parent Folder** | `Desktop/temp` | Where dated folders are created. It is created on first run if missing. |
| **Terminal** | System default | Any installed app. When empty, macOS follows the terminal registered as the default handler for shell scripts — the setting apps like Ghostty, iTerm2, and Warp write when you accept "make this your default terminal" — and falls back to Terminal.app. Windows follows the **Default terminal application** setting (Settings → System → For developers): the Windows Terminal build it names — stable or Preview, "Let Windows decide" meaning stable — when that build is installed, otherwise a Windows PowerShell console. |
| **Folder Name Format** | `yyyy-MM-dd` | Tokens: `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`. Wrap words in single quotes to keep them literal, e.g. `'summer'-yyyy` → `summer-2026`. Use `/` to nest, e.g. `yyyy/MM/dd` creates `2026/08/28`. The result must stay inside the parent folder. |
| **Reveal** | Off | Also reveal the folder in Finder (macOS) or File Explorer (Windows). |

## Notes

- **Folder name format** — tokens are expanded wherever they appear, so quote any word that contains one: `'add'-yyyy` rather than `add-yyyy`, which would otherwise read `dd` as the day. `''` produces a single quote.
- **Terminal on macOS** — the folder is opened with the chosen app via `open`, so any terminal that accepts a folder works (Terminal, iTerm2, Ghostty, Warp, kitty, WezTerm, …).
- **Terminal on Windows** — Windows Terminal is started with `-d` pointing at the folder, so its default profile (PowerShell, cmd, …) applies. Stable and Preview are kept apart: whichever build is chosen, or named by the default terminal setting, is the one launched, and if that build is missing the extension reports it rather than opening the other one. Any other app is launched with the folder as its working directory, which is what PowerShell, cmd, Alacritty and WezTerm pick up; a terminal that always starts in its own configured directory will ignore it. When the default terminal application is the classic console host, or a host the extension cannot start itself, PowerShell is opened in a console window and Windows places it in that host. A packaged (Store) terminal other than Windows Terminal that exposes no executable path cannot be launched; pick its `.exe` directly instead.

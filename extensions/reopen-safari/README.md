# Reopen Safari

Accidentally hit **⌘Q** in Safari? This extension relaunches Safari and clicks **History → Reopen All Windows from Last Session** for you — one Raycast command and everything is back.

## Usage

Run the **Reopen Safari with Last Session** command. Safari launches (if needed) and all windows from the last session are restored.

## Requirements

- macOS with Safari
- **Accessibility access for Raycast** — the extension restores the session via Safari's menu bar, which requires UI scripting. Grant it in *System Settings → Privacy & Security → Accessibility*. macOS will prompt you on first run.

## How it works

The command activates Safari, then clicks the "Reopen All Windows from Last Session" item in the History menu. The menu item is located by its localized title (12 languages supported), with a structural fallback for other locales — so it works regardless of your system language.

Safari is launched without its initial start-page window, so the restored session windows are the only ones that ever appear — no window flashing, and Safari ends up focused in front.

## Troubleshooting

- **"Nothing to reopen"** — Safari has already restored the session (e.g. Safari is set to reopen windows on launch), or there is no previous session to restore.
- **Permission errors** — make sure Raycast is allowed under *Privacy & Security → Accessibility*.

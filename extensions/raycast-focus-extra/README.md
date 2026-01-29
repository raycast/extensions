# Raycast Focus Extra

Do more with Raycast Focus: view your focus sessions and sync them from the system log into the extension.

**macOS only.**

## Commands

- **Focus Sessions** – List focus sessions for a date. Default is today. Use **Pick date** (or **Change date** on an item) to choose another day. Data comes from extension storage. On open, a background sync runs (throttled) and refreshes the list.
- **Sync Focus Sessions** – Sync focus sessions from the macOS unified log into extension storage (last 7 days on first run, then since last sync). Shows a short toast when done. Background refresh runs Sync every 1h (enable in the command’s preferences).

## Setup

No API keys, account, or signup required.

1. Run **Sync Focus Sessions** once to import sessions from the log.
2. Open **Focus Sessions** to view by date (Pick date / Change date if needed).

If sync fails with a permission error, grant **Full Disk Access** to Terminal (or Raycast) in System Settings so the extension can read the log.

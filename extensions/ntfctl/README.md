# 🔔 ntfctl — Raycast Extension

Control macOS Notification Center from Raycast.
Clear, peek, dismiss, count — plus toggle Do Not Disturb —
all from the keyboard with a beautiful Raycast UI.

## Commands

| Command | Mode | Description |
|---------|------|-------------|
| **Clear All Notifications** | `no-view` | Dismiss every visible banner |
| **Peek at Latest Notification** | `view` | Show newest notification with copy & dismiss actions |
| **Dismiss Latest Notification** | `no-view` | Dismiss only the top banner |
| **Count Notifications** | `view` | List all waiting notifications |
| **Toggle Do Not Disturb** | `no-view` | Flip Focus / DnD mode |
| **Toggle Notification Center** | `no-view` | Open or close the NC panel |

## Screenshots

### Peek at Latest Notification
> Shows app name, title, body — with Copy, Dismiss, and clipboard actions.

### Count Notifications  
> Lists all pending notifications with a "Clear All" action.

## Install

### Option 1: Local Install (Recommended)

```bash
# 1. Clone or copy this directory
cd /path/to/macscripts/ntfctl/raycast

# 2. Install dependencies
npm install

# 3. Generate PNG icons
bash assets/generate-icons.sh

# 4. Build and install
npm run build
```

Then in Raycast:
- **Settings → Extensions → + → Import Extension**
- Select the `raycast` directory

### Option 2: Development Mode

```bash
cd /path/to/macscripts/ntfctl/raycast
npm install
npm run dev
```

Raycast will detect the extension in development mode automatically.

## Requirements

- macOS 15 (Sequoia) or later
- **Accessibility permission** granted to Raycast
  - System Settings → Privacy & Security → Accessibility → enable Raycast
- (For DnD toggle) A Shortcut named **"DND Until I Leave"** in Shortcuts.app
  - Action: Set Focus → Toggle → Do Not Disturb

## Configuration

If the `.applescript` files are in a non-standard location,
set the `APPLESCRIPTS_DIR` environment variable:

```bash
export APPLESCRIPTS_DIR="/custom/path/to/scripts"
```

## How It Works

Each command runs the corresponding AppleScript from the
parent `notifications/` directory. The extensions use macOS
UI Scripting (Accessibility API) to:

1. Click the clock in the menu bar to open Notification Center
2. Inspect the UI element tree
3. Click dismiss buttons or read notification text
4. Click the clock again to close Notification Center

## Related

- [ntfctl.applescript](../ntfctl.applescript) — unified CLI interface
- [test.sh](../test.sh) — automated test harness
- [README.md](../README.md) — full documentation & keyboard shortcut guide

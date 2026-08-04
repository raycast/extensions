# Cold Turkey Blocker

Manage [Cold Turkey Blocker](https://getcoldturkey.com/) without leaving Raycast. Search your blocks, start or stop them, create new blocks, add websites and exceptions, configure locks, and control supported breaks from one command.

## Prerequisites

- [Raycast](https://www.raycast.com/) on macOS or Windows
- [Cold Turkey Blocker](https://getcoldturkey.com/) installed on the same computer
- At least one block configured in Cold Turkey, or permission to create one from the extension

The extension uses Cold Turkey's command-line interface. Its executable is detected at the standard install location:

- macOS: `/Applications/Cold Turkey Blocker.app/Contents/MacOS/Cold Turkey Blocker`
- Windows: `C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe`

If Cold Turkey is installed elsewhere, open the extension's preferences in Raycast and update **Cold Turkey Executable**.

On Windows, exit the Cold Turkey desktop interface from its system-tray icon before using the extension. The CLI may time out while the interface is running.

## Usage

1. Open Raycast and run **Manage Cold Turkey**.
2. Search for a block by name, status, or type.
3. Select a block and press `Enter` to start or stop it. If stopping requires a password, the password form opens automatically.
4. Open **Actions** (`⌘ K` on macOS) for additional options, including:
   - Start with saved settings or a timed, password, or random-text lock
   - Add websites or exceptions
   - Start or stop a supported break
   - Open Cold Turkey
5. Press `⌘ N` to create a Website & App block or Device block.
6. Press `⌘ R` to refresh block statuses.

Device blocks can trigger lock-screen, sign-out, or shutdown behavior configured in Cold Turkey. The extension asks for confirmation before potentially locking actions by default; this can be changed in its preferences.

## Limitations

- Cold Turkey's CLI reports whether a block is enabled or disabled, but not its lock type, remaining lock time, or break status.
- Applications cannot be added to Website & App blocks through the CLI; add them in Cold Turkey itself.
- Passwords are not stored by the extension. They are passed directly to the local Cold Turkey process when a command runs.

## Troubleshooting

If a block has an unknown status, refresh it or choose **CLI Diagnostics** from the action panel. Also check that **Cold Turkey Executable** points to the installed application and, on Windows, that the Cold Turkey interface has been exited from the system tray.

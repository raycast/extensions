# Read Me Maybe

> Time to ditch the dock and reclaim that extra screen real estate for your favorite apps.

Read Me Maybe is an extension for showing and consolidating dock badges on macOS. Check the aggregated status in your menu bar, and view the breakdown per source in the **View Unreads** command.

## Setup

1. Open the **Read Me Maybe** menu-bar command and choose **Check Access**.
2. Allow Raycast in **System Settings > Privacy & Security > Accessibility**. Also allow the System Events Automation request if the OS asked for it.
3. Open **View Unreads** command and configure however many sources you desire. Each Source has an **Open** command, which defaults to `open` for that application's installed path, you can customize the open command if needed.
4. The **Read Me Maybe** menu-bar now command refreshes approximately every 15 seconds. Timing can be delayed by Raycast or macOS energy management.

![Privacy Settings](assets/privacy.png)

💡 Assign the **View Unreads** command to a hotkey (for example, `hyper+/`) and you won't need to touch your

## Keyboard Shortcuts

| Shortcut | Action                                  |
| -------- | --------------------------------------- |
| `↵`      | Open source application                 |
| `tab`    | Enable / disable the highlighted source |
| `⌘N`     | Add a new source                        |
| `⌘E`     | Edit source                             |
| `⌃E`     | Remove source                           |
| `⌥⇧↑`    | Move the source up in its section       |
| `⌥⇧↓`    | Move the source down in its section     |

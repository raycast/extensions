# Dock Badges

Notification badge counts from your Dock, in the menu bar — for people who hide their Dock.

If you auto-hide your Dock, the red badges on Slack, Messages, Mail, etc. are invisible until you go looking for them. Dock Badges keeps a small symbol in the menu bar that shows a badge and the total count whenever any app in your Dock has notifications, so you never miss one.

## Features

- Works with every app in your Dock — pinned or running
- Menu bar symbol with a badge and the summed count when notifications are waiting
- Dropdown lists the apps that currently have badges; click one to open it
- Optionally hide the menu bar item entirely while everything is clear
- Choose a **Circle**, **Bell** or **App** symbol, in **Filled** or **Outline** style; it turns red when notifications are waiting
- Monochrome icon that matches your menu bar, light or dark

## Setup

Dock Badges reads badge counts through macOS Accessibility, so Raycast needs to be allowed under
**System Settings → Privacy & Security → Accessibility**. If permission is missing, the menu bar item
will say so and take you straight to the setting.

## Preferences

| Preference | Description |
| --- | --- |
| Icon | Circle, Bell or App symbol |
| Icon Style | Filled or Outline |
| Show total count next to the icon | Display the summed badge count next to the icon |
| Hide menu bar item when there are no badges | Remove the item when no app has a badge |

## Notes

- Badge counts refresh every 10 seconds in the background.
- Only apps that appear in the Dock (pinned or currently running) are tracked.
- If a preference change doesn't show up after the next refresh, toggle *Background Refresh* off and on
  in the command's settings.

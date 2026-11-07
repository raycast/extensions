# Trackpad & Mouse Tools

Every trackpad and mouse setting, one keystroke away. Switch right-click modes, set pointer speed and click
mouse buttons from the keyboard – no System Settings, no logging out.

## Commands

| Command | What it does |
| --- | --- |
| **Toggle Secondary Click** | Two fingers ↔ corner (corner chosen in the command preferences) |
| **Secondary Click with Two Fingers / in Bottom Right Corner / in Bottom Left Corner** | Sets one mode directly |
| **Toggle Tap to Click** | Tap to click on or off |
| **Toggle Natural Scrolling** | Scroll direction on or off (macOS applies it to trackpad and mouse) |
| **Toggle Three Finger Drag** | Three finger drag on or off; swipes move to four fingers, like in macOS |
| **Set Mouse Speed / Set Trackpad Speed** | Pick a level from 1 to 10 |
| **Increase / Decrease Mouse Speed** | One step faster or slower |
| **Left Click / Right Click / Middle Click** | Click at the pointer |
| **Hold Left / Right / Middle Button** | Keep a button pressed (see below) |
| **Release Mouse Buttons** | Lets go of every button this extension holds |
| **Trackpad & Mouse Settings** | Every option from System Settings in one searchable list |

Give the commands you use most a hotkey: select the command in Raycast, press `⌘K` → **Configure Command**.

## Trackpad & Mouse Settings

The settings list shows every option from System Settings › Trackpad and Mouse, grouped like macOS:

- **Point & Click:** secondary click, tap to click, look up & data detectors, click pressure, tracking speed, force click
- **Scroll & Zoom:** natural scrolling, zoom in or out, smart zoom, rotate
- **More Gestures:** swipe between pages, full-screen apps, Mission Control, App Exposé, Notification Center, Show Desktop
- **Mouse:** tracking speed, scrolling speed, double-click speed, pointer acceleration, Magic Mouse secondary click
- **Accessibility:** dragging style – off, without drag lock, with drag lock, three finger drag

Toggle with `↵`, pick options with `⌘K`, reset everything to the macOS defaults with `⌘⇧⌫`.

## Holding a Button

Raycast knows when a hotkey is pressed, not when it is released, so each **Hold** command has a **Release**
preference:

- **After the Next Click** (default) – the button goes up when you click once (a left hold waits for a right click)
- **After a Few Seconds** – after the number of seconds you set, 5 by default
- **When I Run the Command Again** – when you press the hotkey a second time

Running the command again always releases the button right away. Typical use: a hotkey on **Hold Middle
Button**, pointer on a 3D model, press the hotkey, move to orbit, click once to let go.

## How It Works

The extension writes the same preferences System Settings writes – for the built-in trackpad, the Magic
Trackpad and the Magic Mouse – and asks macOS to reload them, so changes apply without logging out. Gestures
handled by the Dock (Mission Control, App Exposé, Show Desktop) restart the Dock for a moment.

The click commands post mouse events through macOS' CoreGraphics, using the Accessibility permission Raycast
already has. A hold that ends after the next click or after a few seconds starts a small `osascript` process
that lets go of the button: it exits after the release click (at the latest after ten minutes) or after the
chosen number of seconds. Running the hold command again or **Release Mouse Buttons** stops it right away. No
helper app, no network requests.

System Settings reads its values when it opens, so close and reopen it to see a change there.

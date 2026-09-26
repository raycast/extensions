# Jumper

![Jumper demo: Back, Forward, Toggle, and History](media/demo.gif)

A browser-style Back button for your Mac's apps.

Cmd+Tab only knows "most recent" and reshuffles every time you switch, so getting back to the app you were in three switches ago is guesswork. Jumper lets you step back through your recently used apps, and forward again, exactly like history in Safari or VS Code.

## Commands

- **Back**: switch to the app you used before this one. Run it again to keep going back.
- **Forward**: retrace a Back step.
- **Toggle**: flip between your two most recent apps. Run it again to switch back.
- **History**: list running apps from most to least recently used and jump to any of them.

## Setup

Back, Forward, and Toggle are meant to be used with hotkeys:

1. Open Raycast Settings → Extensions → Jumper.
2. Assign a hotkey to each command, for example `⇧⌘[` for Back, `⇧⌘]` for Forward, and a double tap of `⌘` for Toggle (the keys shown in the demo).

`⇧⌘[` and `⇧⌘]` also switch tabs in browsers, Terminal, and many editors; a Raycast hotkey takes priority, so pick something like `⌃⌥[` / `⌃⌥]` if you rely on those.

No permissions and no background process needed. The extension reads the order macOS already keeps for Cmd+Tab.

## How it works

- The first **Back** remembers your current app order and moves one step back.
- Pressing Back again goes further; **Forward** retraces.
- Switching apps any other way (click, Cmd+Tab) starts a fresh history, just like visiting a new page in a browser clears the forward history.
- Apps you quit are skipped.
- In **History**, **Remove from History** (`⌃X`) hides an app (including the one you're in, once you leave it), for example one you closed all windows of but didn't quit. It comes back once you use it again.
- **Exclude from History** (`⌃⇧X`) hides an app for good. Excluded apps are listed at the bottom of History; **Include in History** brings one back.

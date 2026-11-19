# Spacepal for Raycast

Switch macOS Spaces by name, note or app, send the front window to another Space, jump back
to your last Space and open the overview, all from Raycast.

## Setup

1. Install [Spacepal](https://getspacepal.com/download/) (macOS 14 or later). It has a 14-day
   free trial with no account.
2. Open Spacepal and give it Accessibility permission when it asks.
3. Run **Switch Space** in Raycast.

The extension reads the Space list Spacepal keeps on your Mac and sends commands through
Spacepal's `spacepal://` links. It makes no network requests.

If the list is empty, Spacepal is not running: open it from Applications.

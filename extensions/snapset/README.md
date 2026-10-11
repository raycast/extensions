# Snapset for Raycast

Access your [Snapset](https://snapset.co/) workspaces directly from Raycast.

Snapset is a Mac workspace restoration app. Rather than only arranging windows, it captures a broader
working state — open apps and windows, their positions and sizes across multiple displays and macOS
Spaces, and the browser tabs and Finder folders you have open — and restores all of it in one step,
reopening missing apps and, if you like, hiding apps that are not part of the workspace.

## Commands

- **Apply Layout** — restore a workspace already saved in Snapset. The list shows the layouts saved
  for the displays you are using. Press ⌘S to save the current arrangement instead (named after what
  you typed), or create a Quicklink to give a layout its own alias or hotkey in Raycast.
- **Save Layout** — capture the current workspace as a new Snapset layout, optionally with a name.

## Setup

Install the latest version of [Snapset](https://snapset.co/) (a 14-day free trial is included, with no
account or credit card required). A new install has no layouts yet: save one first with **Save Layout**
or in Snapset itself, then use **Apply Layout**.

Snapset does the window work, so Raycast needs no extra permissions: the layouts are read through
Snapset's own command line, and save and restore requests go to Snapset through its `snapset://` links.

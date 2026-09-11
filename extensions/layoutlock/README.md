# LayoutLock for Raycast

Save and restore macOS window layouts from Raycast. This extension is a request-only bridge to the LayoutLock app; LayoutLock handles Accessibility permission, progress, Free/Pro limits, completion, and errors.

## How it differs

LayoutLock restores previously saved workspaces through the LayoutLock app, including display-aware window placement, app relaunching, and optional browser restoration. Unlike window-tiling extensions, it does not arrange currently open windows directly inside Raycast.

## Requirements

- macOS 14 or later
- A current version of [LayoutLock](https://layoutlock.app)
- Accessibility access granted to LayoutLock

## Commands

- **Restore Layout** searches the layouts already saved in LayoutLock.
- **Save Current Layout** saves the current windows. Its optional argument supplies the layout name; without one, LayoutLock uses its usual suggested name.

## Privacy

The extension reads only `~/Library/Application Support/LayoutLock/Integrations/layouts-v1.json`. This summary contains layout IDs, names, dates, and aggregate window/app/display counts. It does not contain browser URLs, file targets, window titles, or window geometry. The extension does not send this data anywhere.

Requests are handed to the installed LayoutLock app using its local URL scheme. See [setup and troubleshooting](https://layoutlock.app/raycast).

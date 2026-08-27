# FastNav for Raycast

FastNav for Raycast brings the existing FastNav accessibility search into the Raycast bar. It lists menu commands, menu paths, displayed keyboard shortcuts, and optionally visible actionable controls from the focused window.

## Features

- Searches every standard menu command exposed through macOS Accessibility.
- Includes displayed keyboard shortcuts in results and search matching.
- Optionally searches visible buttons, links, tabs, rows, and other actionable controls.
- Runs the selected accessibility action directly instead of replaying its shortcut.
- Switches between running applications with Raycast's `⌘ P` application picker.
- Preserves disabled states and learns from frequently and recently used actions.
- Uses the same Swift accessibility readers as the FastNav macOS app.

## Accessibility Setup

On first use, choose **Request Accessibility Access**. In **System Settings → Privacy & Security → Accessibility**, enable the FastNav bridge, then return to Raycast and refresh the command.

FastNav uses Accessibility only to read and run actions in the application you select. The bridge runs locally, does not use the network, and is built from the Swift source included with this extension.

Visible interface search is on by default. To change it, open **Raycast Settings → Extensions → FastNav** and switch **Include Visible Interface Elements** on or off.

## Install for Local Development

Local development requires macOS 14 or newer, Raycast, Node.js, and Xcode 16.3 or newer.

```sh
cd "raycast extension"
npm install
npm run dev
```

Open Raycast and run **Search App Actions**. The original FastNav app does not need to be installed or running.

## Build checks

```sh
npm run typecheck
npm run lint
npm run build
```

If your active developer directory points to Command Line Tools instead of Xcode, prefix development and build commands with:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run build
```

## Publish to the Raycast Store

Confirm that `author` in `package.json` matches your Raycast username. Then run the checks above and submit the extension:

```sh
npm run publish
```

Raycast will ask you to sign in to GitHub and will open a pull request in the Raycast extensions repository for review.

See [INSTALL_AND_PUBLISH.md](./INSTALL_AND_PUBLISH.md) for the complete publishing checklist and instructions for installing FastNav on another Mac before or after Store release.

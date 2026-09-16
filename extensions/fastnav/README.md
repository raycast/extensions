# FastNav for Raycast

FastNav for Raycast brings the existing FastNav accessibility search into the Raycast bar. It searches menu commands, menu paths, displayed keyboard shortcuts, and optionally visible actionable controls across all running applications, while ranking the previously focused application higher.

## Features

- Searches every standard menu command exposed through macOS Accessibility.
- Includes displayed keyboard shortcuts in results and search matching.
- Optionally searches visible buttons, links, tabs, rows, and other actionable controls.
- Searches all running applications by default and boosts actions from the previously focused application.
- Shows shared Apple-menu and Services actions only once in cross-application results.
- Runs the selected accessibility action directly instead of replaying its shortcut.
- Filters to an individual running application with Raycast's `⌘ P` application picker.
- Preserves disabled states and learns from frequently and recently used actions.
- Uses the same Swift accessibility readers as the FastNav macOS app.

## Accessibility Setup

On first use, choose **Request Accessibility Access**. In **System Settings → Privacy & Security → Accessibility**, enable the FastNav bridge, then return to Raycast and refresh the command.

FastNav uses Accessibility only to read and run actions in your running applications. The bridge runs locally, does not use the network, and is built from the Swift source included with this extension.

Cross-application search and visible interface search are on by default. To change either behavior, open **Raycast Settings → Extensions → FastNav** and use **Search Across All Applications** or **Include Visible Interface Elements**. Turning off cross-application search starts each command session with only the previously focused application; the application picker can still switch to another running app.

## Install for Local Development

Local development requires macOS 14 or newer, Raycast, Node.js, and Xcode 16.3 or newer.

```sh
cd raycast_extension
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

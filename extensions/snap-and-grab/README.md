# Snap & Grab

Capture a screenshot. Tap back for earlier ones. Copy the group.

Snap & Grab is a macOS Raycast extension with native area/window capture, a thumbnail history picker, and a passive copied confirmation. It is being prepared for Store submission under `hushhash`; a Store listing is not live yet.

## Capture and Copy

1. Find **Capture and Copy** in Raycast and use **Configure Command → Set Hotkey**. Control+Command+4 is a suggested starting point.
2. Hold those modifiers, press the shortcut key, and draw an area. Press Space for window selection.
3. Keep the modifiers held and press the shortcut key again to add the previous saved screenshot. Each extra press adds one older image.
4. Check the count and thumbnails, then release the modifiers to copy.
5. Paste with Command+V. The confirmation shows how many screenshots were copied.

One image is copied as PNG data. Several images are copied as separate files, newest first. The receiving app controls multi-file paste support. New captures are also saved to your screenshot folder.

Escape cancels native capture without changing the previous clipboard. Launching the command from Raycast search without held modifiers takes a single capture. Additional presses during rectangle selection are ignored.

## Select Recent Screenshots

Open **Select Recent Screenshots** to browse saved images without taking a new capture. Return selects or deselects an image. The secondary action, Command+Return, copies the selected group. Use Refresh Screenshots to update the list, or Show in Finder to inspect a file. No selection is copied when you close the command.

## Preferences

- **Screenshot Folder:** leave empty to use your macOS screenshot location, or choose a folder.
- **Copy Confirmation:** Off, Brief (1.5 seconds), or Extended (3 seconds). Clipboard transfer still completes when confirmation is off.
- **Thumbnail Previews:** show or hide previews in the browser and native HUDs.

Global hotkeys are assigned once by the user in Raycast; extensions cannot declare default global bindings. Suggested bindings are **Control+Command+4** for Capture and Copy and **Control+Command+5** for Select Recent Screenshots. Find either command, press Command+K, choose Configure Command → Set Hotkey, and record the combination. Inside Select Recent Screenshots, Return selects and Command+Return copies; these controls are shown at the top of the view. To use Command+Shift+4, first disable or reassign the conflicting macOS shortcut in System Settings → Keyboard → Keyboard Shortcuts → Screenshots. Native Screenshot may interpret held modifiers such as Shift while drawing; test the chosen gesture before replacing your normal workflow.

## Permissions and privacy

macOS may request Screen Recording and access to the chosen screenshot folder. Follow the prompt for the app named by macOS when it matches the action you started. The extension does not simulate a paste keystroke or add a global keyboard event listener.

Screenshot handling runs locally, with no screenshot uploads, external service accounts, or extension analytics. Saved images remain until you delete them. Other applications with clipboard access can read copied content. Native errors are logged locally in Raycast's extension support directory; redact filenames before sharing diagnostics.

## Troubleshooting

If a hotkey does not run, check for a Raycast or macOS shortcut conflict. If history is empty, check the screenshot folder and its permission. If a selected file is removed or unreadable, refresh the list and select again. If only one file pastes, confirm the HUD count and try attaching the saved files directly in the receiving app.

When migrating from the local Script Command prototype, keep it as a fallback until both extension commands work. Then clear its old hotkey or remove its script directory so only one command owns the shortcut. The extension uses its own support directory.

## Development

Requires Node 22.22.2 or newer, npm, and Xcode 16.3 or newer for Raycast's official Swift integration. Ordinary Store installations should use the bundled native executable; end-user native packaging is part of release verification.

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

The Swift bridge uses [Raycast's official Swift tools](https://github.com/raycast/extensions-swift-tools). `swift/Package.swift` pins its dependency, and native sources remain readable in `Sources/`. No native binary is downloaded from a private host. `make verify` still checks the standalone prototype with synthetic fixtures; its `.build/snap-and-grab` executable is not the Store entry point.

The optional cross-process clipboard harness in `tests/clipboard-process/` temporarily writes synthetic files to the system clipboard. It is excluded from default tests. HUD checks render synthetic content offscreen without capturing the user's desktop.

## Release status

Public Store submission is in preparation. See [release checks](docs/release-checks.md) for remaining manual installation, permission, architecture, and receiving-app checks. Store publication happens after Raycast reviews and merges the submission.

MIT licensed. See [LICENSE](LICENSE).

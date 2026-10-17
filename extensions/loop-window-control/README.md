# Loop Window Control

Control [Loop](https://github.com/mrkai77/Loop) from Raycast. Search 71 window actions, assign Raycast hotkeys to common actions, and run your named Loop layouts, cycles, and stashes.

This is an independent integration. It uses Loop's native URL scheme and does not bundle or modify Loop. The extension icon is original artwork.

## Requirements

- macOS and Raycast.
- **Loop 1.4.2 or later**, installed and configured. [Download Loop](https://github.com/mrkai77/Loop/releases) or install it using `brew install --cask loop`.
- Enable **Loop** in **System Settings → Privacy & Security → Accessibility**.

Open Loop once to complete its first-run setup before using the extension. No additional CLI, local server, API key, or account is required.

## Commands

| Command                          | Function                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Window Actions                   | Search 71 actions: maximize, center, halves, quarters, thirds, fourths, screen switching, resizing, movement, focus, undo, and more |
| Left / Right / Top / Bottom Half | Run half-screen actions directly                                                                                                    |
| Maximize / Center / Undo         | Run these common actions directly                                                                                                   |
| Next Screen / Previous Screen    | Move the target window between displays                                                                                             |
| Run Named Keybind                | Run a layout, cycle, or stash already configured and named in Loop                                                                  |
| Check Installation               | Check installation metadata and read troubleshooting instructions                                                                   |

Assign hotkeys or aliases to the nine direct commands in Raycast Settings → Extensions. **Copy Loop URL** in the action list copies an action's native URL.

### Named Keybinds

Give your custom layout, cycle, or stash a name in Loop. Run **Run Named Keybind** and enter that name, not a URL. Matching is case-insensitive. Spaces and Unicode are supported. Names containing `/` or control characters, and the reserved names `.`, `..`, and `list`, are not supported.

**Show Named Keybinds** asks Loop to open its list in your default text editor. Loop creates a temporary text file; the extension does not parse that file or read your Loop preferences.

## Preferences

- **Loop Application Path:** defaults to `/Applications/Loop.app`. Change this if you installed Loop elsewhere, such as `~/Applications/Loop.app`.
- **Focus Restore Delay:** waits after closing Raycast before sending an action. Defaults to 250 ms; try 500 or 800 ms if focus restoration is slow.

## Troubleshooting

### “Sent to Loop,” but the window did not change

Loop's URL interface does not acknowledge execution. The message means macOS accepted the request, not that a window moved. Check Loop's Accessibility permission, first-run setup, and whether the target window is resizable. Check that a named keybind exists in Loop. Earlier Loop versions may not support all listed actions.

### The wrong window moves

Window selection follows Loop's settings. If its option to resize the window under the cursor is enabled, move the cursor over the intended window or disable that option. Focus your target window before opening Raycast.

### Loop was not running

macOS starts Loop when a URL is delivered. If the first request is not applied during startup, wait until Loop is ready and try again. The extension does not automatically repeat requests because repeating a cycle or undo could have an unintended result.

### Installation or delivery errors

The extension checks the application path, bundle identifier, and declared URL scheme before closing Raycast. If a check fails, its error message links to extension preferences. Installation diagnostics cannot verify Accessibility permission or whether a window action completed.

## Development

Install Node.js 22.22.2 or later and npm, then run:

```sh
npm ci
npm run dev
```

Validation:

```sh
npm run build
npm run typecheck
npm run lint
npm test
```

The action catalog is based on Loop tag `1.4.2`:

- [URL command handler](https://github.com/mrkai77/Loop/blob/1.4.2/Loop/Core/URLCommandHandler.swift)
- [Window directions](https://github.com/mrkai77/Loop/blob/1.4.2/Loop/Window%20Management/Window%20Action/WindowDirection.swift)

No upstream implementation or artwork is copied. Newer development-branch Space actions are intentionally excluded from the 1.4.2 catalog. Parameterized Custom, Cycle, and Stash actions are invoked through named keybinds.

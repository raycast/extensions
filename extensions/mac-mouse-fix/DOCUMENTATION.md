# Documentation

The abbreviation for Mac Mouse Fix is MMF.

This extension is editing the `config.plist` configuration file of the Mac Mouse Fix app.
The file is located at `~/Library/Application Support/com.nuebling.mac-mouse-fix/config.plist` by default.

A custom config path can be specified in the extension preferences if your config file is in a different location.

It contains entries for all settings of the MMF app. Editing a value in the file will need a reload of the MMF helper process for the udpate to appear in the app.

## MMF Helper Process

The helper runs as `com.nuebling.mac-mouse-fix.helper` and uses `CFMessagePort` to communicate with the main process.

The `update_mmf_helper.m` file (binary `update_mmf_helper` in `/assets`) sends the message `configFileChanged` to the helper process to propagate the config file changes.

## Compile MMF Helper

Run the following to compile the helper to a macOS universal binary.

```bash
clang -arch x86_64 -arch arm64 -fmodules update_mmf_helper.m -o update_mmf_helper
```

## Commands

There are mainly two types of commands at the moment:

- toggle command -> they toggle a single setting of the app
- set command -> they show a list of possible settings you can choose from

## Current Commands

See `utils/config.ts` for the configuration of all commands and their counterpart in the MMF `config.plist` file.

## Code Structure

The extension code is organized into modular utilities:

- `utils/plist.ts` - Interface for reading/writing the `config.plist` file and error handling
- `utils/helper.ts` - Interface for managing the MMF helper process
- `utils/config.ts` - High-level config operations and command definitions
- `utils/useConfigCheck.ts` - React hook for config validation

# Mac Mouse Fix Configuration Settings

## General Settings

| Setting                 | Description                                   | Possible Values |
| ----------------------- | --------------------------------------------- | --------------- |
| `buttonKillSwitch`      | Disables all button remapping                 | `true`, `false` |
| `scrollKillSwitch`      | Disables all scroll modifications             | `true`, `false` |
| `showMenuBarItem`       | Shows/hides menu bar icon                     | `true`, `false` |
| `checkForUpdates`       | Enables automatic update checking             | `true`, `false` |
| `checkForPrereleases`   | Includes beta versions in updates             | `true`, `false` |
| `lockPointerDuringDrag` | Locks pointer position during drag operations | `true`, `false` |

## Pointer Settings

| Setting                 | Description                                      | Value Range                            |
| ----------------------- | ------------------------------------------------ | -------------------------------------- |
| `acceleration`          | Mouse acceleration curve                         | `0.0` to `1.0` (decimal)               |
| `sensitivity`           | Base mouse sensitivity                           | Integer values (typically `1` to `10`) |
| `useSystemAcceleration` | Uses macOS system acceleration instead of custom | `true`, `false`                        |

## Scroll Settings

| Setting              | Description                           | Possible Values                 |
| -------------------- | ------------------------------------- | ------------------------------- |
| `smooth`             | Scrolling smoothness level            | `"off"`, `"regular"`, `"high"`  |
| `speed`              | Scrolling speed                       | `"slow"`, `"regular"`, `"high"` |
| `reverseDirection`   | Inverts scroll direction              | `true`, `false`                 |
| `precise`            | Enables precise scrolling mode        | `true`, `false`                 |
| `trackpadSimulation` | Makes mouse scroll feel like trackpad | `true`, `false`                 |

### Scroll Modifiers

| Modifier     | Key Code  | Description                        |
| ------------ | --------- | ---------------------------------- |
| `horizontal` | `131072`  | Shift key for horizontal scrolling |
| `precise`    | `524288`  | Option key for precise scrolling   |
| `swift`      | `262144`  | Command key for fast scrolling     |
| `zoom`       | `1048576` | Control key for zooming            |

## Button Remapping

### Trigger Types

- **Click**: `{"button": X, "duration": "click", "level": 1}`
- **Hold**: `{"button": X, "duration": "hold", "level": 1}`
- **Double Click**: `{"button": X, "duration": "click", "level": 2}`
- **Scroll**: `"scrollTrigger"`
- **Drag**: `"dragTrigger"`

### Effect Types

| Effect Type                        | Description               | Variant Examples                                             |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `symbolicHotkey`                   | System keyboard shortcuts | `70` (Look Up), `36` (Mission Control), `160` (Show Desktop) |
| `smartZoom`                        | Smart zoom functionality  | No variants                                                  |
| `modifiedScrollEffectModification` | Modified scroll behavior  | `"fourFingerPinch"`, `"zoom"`                                |
| `modifiedDragType`                 | Modified drag gestures    | `"threeFingerSwipe"`, `"twoFingerSwipe"`                     |

### Common Symbolic Hotkey Variants

- `70`: Look Up & Data Detectors (Force Touch)
- `36`: Mission Control
- `160`: Show Desktop
- `32`: Application Windows (App Exposé)
- `81`: Launchpad

## Button Numbers

- `1`: Left click (primary)
- `2`: Right click (secondary)
- `3`: Middle click (scroll wheel)
- `4`: Side button 1 (typically "Back")
- `5`: Side button 2 (typically "Forward")

## Default Configurations

The file includes two default configurations:

- **`threeButtons`**: For mice with 3 buttons (left, right, middle)
- **`fiveButtons`**: For mice with 5+ buttons (includes side buttons)

## License Settings

| Setting          | Description                | Value Type             |
| ---------------- | -------------------------- | ---------------------- |
| `trialDays`      | Free trial period          | Integer (days)         |
| `price`          | App price in cents         | Integer                |
| `maxActivations` | Maximum device activations | Integer                |
| `freeCountries`  | Countries with free access | Array of country codes |

## State Information (Read-only)

- `lastLaunchedBundleVersion`: Last app version used
- `launchesOfCurrentBundleVersion`: Launch count for current version
- `launchesOverall`: Total launch count
- `remapsAreInitialized`: Whether button mappings are set up

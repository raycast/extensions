# AeroSpace Tiling Window Management

Control the [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager from Raycast.

The extension uses AeroSpace's CLI as its runtime interface. It does not synthesize keyboard events or require Accessibility permission to trigger your bindings.

![shortcuts](./media/aerospace-1.png)

![menubar](./media/menubar.jpg)

![switcher](./media/aerospace-3.png)

![view config](./media/aerospace-4.png)

## Features

- View the shortcuts loaded by AeroSpace and trigger them with `aerospace trigger-binding`
- View the complete TOML config file alongside the binding configuration reported by the running AeroSpace process
- Access AeroSpace shortcuts from the menu bar
- Browse workspaces together with their deduplicated open apps and configured workspace bindings
- Find windows across the focused or all workspaces, then focus, move, or tile them

## Requirements

- Raycast for macOS
- AeroSpace 0.11 or newer (the first release with `trigger-binding`)

## Installation

1. Install [Raycast](https://raycast.com)
2. Install AeroSpace and make sure it is running
3. Install the extension from the Raycast Store by searching for "AeroSpace"

The extension detects the `aerospace` binary in common Homebrew, Nix, and nix-darwin locations. If you installed AeroSpace elsewhere, set **AeroSpace Binary Path** in the extension preferences to the executable's full path. Run `which aerospace` in a terminal to find it.

## Usage

- Open Raycast and type `AeroSpace` to view the available commands
- Use **Show AeroSpace Shortcuts** to search and activate bindings from any mode
- Use **Show AeroSpace Config** to inspect the full file or the bindings loaded by the running process
- Use **Go to Workspace** to search workspaces and see their open apps
- Use **Enable AeroSpace Menu Bar Shortcuts** for persistent menu bar access
- Use **Switch Apps in Workspace** to find and manage open windows

The config view deliberately shows two sources. The main view is the complete file returned by `aerospace config --config-path`. **View Loaded Binding Configuration** calls `aerospace config --get . --json`; AeroSpace currently exposes only `mode.*` values through that command. Shortcut activation prefers this loaded configuration and falls back to the file for older CLI versions.

## Integration

The extension supports programmatic access via Raycast deeplinks using `launchContext`. This allows integration with window tile manager tools like SketchyBar, Alfred, Keyboard Maestro, or custom scripts.

### Deeplink Format

```bash
raycast://extensions/limonkufu/aerospace/switchApps?arguments={\"workspace\":\"all\"}&context={\"searchText\":\"AppName\"}
```

**Parameters:**

- `arguments` - UI parameters, such as workspace selection
- `context` - launch context passed without showing UI prompts, such as search text for pre-filtering

This enables external tools to trigger the app switcher with pre-filtered search without displaying argument input prompts.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

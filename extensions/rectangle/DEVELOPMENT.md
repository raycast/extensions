# Development

## Icons

Many of the icon templates in `src/icons/window-position-templates` are sourced from the rectangle repo: <https://github.com/rxhanson/Rectangle/tree/main/Rectangle/Assets.xcassets/WindowPositions>

The Rectangle Pro icon templates which are present in that directory have been graciously provided by Ryan Hansen.

The actual light / dark icons used in the extension are generated from these templates via a script. Read on if you wish to regenerate / modify the icons.

### Generate Icons from Templates

External dev dependencies for the project are managed via [Devbox](https://github.com/jetify-com/devbox).

Assuming you have devbox installed, running `devbox run generateIcons` from the repository root will perform the following:

1. Install necessary dependencies (python and pillow)
2. Run the included script `src/icons/generateIcons.py`

## Todo / Roadmap

- [ ] add additional commands which rectangle implements (eg - todo commands)
- [ ] document support for emulating "Reasonable Size" via `specified` - see [rectangle docs](https://github.com/rxhanson/Rectangle/blob/main/TerminalCommands.md#add-an-extra-centering-command-with-custom-size)
- [ ] swap out icons for large variants where possible
- [ ] add support for custom actions / layouts

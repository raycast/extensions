# Rectangle

Browse & trigger [Rectangle](https://rectangleapp.com) window-management actions from Raycast.

## Development
*(information in this section is only relevant if re-generating the window position icons. For all other purposes, refer to raycast extension docs)*

### Generate icons
Icon templates in `src/icons/window-position-templates` are sourced from the rectangle repo: https://github.com/rxhanson/Rectangle/tree/main/Rectangle/Assets.xcassets/WindowPositions

External dev dependencies for the project are managed via [Devbox](https://github.com/jetify-com/devbox).

Running `devbox run generateIcons` from the repository root will perform the following:

1. Install necesarry dependencies (python and pillow)
2. Run the included script `src/icons/generateIcons.py`

### Todo
 - [ ] clean up ordering and groupings / derive groupings from [source](https://github.com/rxhanson/Rectangle/blob/cb791e670a7d84bc4e4ad4c3622a915ab016234d/Rectangle/WindowAction.swift#L587)
 - [ ] clean up titles & descriptions / derive from [source](https://github.com/rxhanson/Rectangle/blob/cb791e670a7d84bc4e4ad4c3622a915ab016234d/Rectangle/WindowAction.swift#L231)
 - [ ] add additional commands which rectangle implements (eg - todo commands)
 - [ ] document support for emulating "Reasonable Size" via `specified` - see [rectangle docs](https://github.com/rxhanson/Rectangle/blob/main/TerminalCommands.md#add-an-extra-centering-command-with-custom-size)
 - [ ] investigate support for Rectangle Pro

# Dock Switcher

A Raycast extensions that allows you to save MacOS dock profiles and switch between them with a single command.

## Features

- Save current dock into a named profile directly from a Raycast command
- Switch between saved dock profiles with a single command

## Requirements

- [dockutil](https://github.com/kcrawford/dockutil) - command line utility for managing macOS dock items
  - Install with Homebrew: `brew install dockutil`

### Disclaimer
In order to add new items to the dock, this extensions removes all existing items and tries to re-add the ones you selected in the profile. This means that if something goes wrong during the process, you might end up with an empty dock.

# SpaceJump

Switch and manage macOS desktop Spaces directly from Raycast.

## Requirements

- [SpaceJump](https://www.getspacejump.com) must be installed and running
- macOS 13.0 or later

## Commands

### List Spaces

Browse all your desktop spaces in a searchable list. The current space is highlighted with a green checkmark. Each space shows its custom color. Select any space to switch to it. The list updates live as you switch spaces.

### Jump to Space

Quickly jump to any space by typing its name. Shows all non-current spaces with Raycast's fuzzy search. Select a space and Raycast closes automatically after switching.

## How it works

SpaceJump writes a state file with your current spaces whenever you switch. This extension reads that file to display your spaces with their names, colors, and current state. It uses SpaceJump's URL scheme (`spacejump://`) to trigger space switches.

## Features

- Live updates — current space indicator refreshes automatically
- Space colors — each space shows its custom color from SpaceJump
- Multi-display support — spaces grouped by display
- Fuzzy search — find spaces quickly by typing part of the name

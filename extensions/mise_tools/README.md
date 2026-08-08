# mise

Raycast Extension for mise

## Features

| No | Feature |
| :---: | ------ |
| 1 | Search Tool |
| 2 | Show Install Tools List |
| 3 | Show Outdated Tools List |
| 4 | Prune Tools |

## Prerequisites

- [mise](https://mise.jdx.dev/) must be installed on your machine.
- If `mise` is not on your `PATH` or in a common install location, set the "Mise Binary Path" preference to its absolute path.

## Installation

This extension is not yet published to the Raycast Store, so install it from source:

1. Clone this repository
2. Install dependencies: `npm install`
3. Run `npm run dev` to start Raycast's hot-reload development mode and load the extension

## Usage

### Search Tool

Same result as running `mise search`
Search tools from the mise registry with filter by name, and install the latest version.

1. Open Raycast
2. Type "Search Tools"
3. Start typing tool name, or select tool by arrow keys
4. Press Enter to install the tool globally

### Show Install Tools List

Same result as running `mise ls`
Show the installed tool list and reveal in Finder or uninstall it.

1. Open Raycast
2. Type "Show Installed"
3. Start typing tool name, or select tool by arrow keys
4. Press Enter to Reveal in Finder, or Uninstall Version(s)

### Show Outdated Tools List

Same result as running `mise outdated`
Show outdated tools and upgrade them.

1. Open Raycast
2. Type "Show Outdated"
3. Start typing tool name, or select tool by arrow keys
4. Press Enter to Upgrade tool

### Prune Tool

Same result as running `mise prune`
Deletes unused tool versions

1. Open Raycast
2. Type "Prune Unused Versions"
3. Start typing tool name, or select tool by arrow keys
4. Press Enter to Prune the selected tool, or Prune All to remove all prunable versions

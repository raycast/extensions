# Link Transformer

A Raycast extension for saving, searching, and transforming links with custom actions.

## Why Use Link Transformer?

If you frequently work with URLs and need to apply custom transformations—like adding tracking parameters, or modifying domains—this extension streamlines the process. Instead of manually editing URLs in your browser, define reusable JavaScript actions in Raycast and apply them instantly. It's perfect for developers, marketers, or anyone who handles links regularly and wants quick, programmable URL manipulation without leaving their workflow.

If you just need basic link storage without transformations, consider simpler bookmarking tools. But if you want programmable, keyboard-driven link processing, this is for you.

## Features

- **Save Links with Aliases**: Store URLs with searchable aliases for quick access.
- **Fuzzy Search**: Find links by typing partial matches in URLs or aliases.
- **Custom Actions**: Create JavaScript functions to transform URLs (e.g., `url + '?utm=source'`).
- **Keyboard Shortcuts**: Assign shortcuts to actions for even faster execution.
- **Instant Browser Opening**: Apply actions and open results directly in your browser.
- **Import/Export Settings**: Easily import and export your links and actions in JSON format for backup or sharing.
- **Client-Side Only**: All data is stored locally on your device—no servers, no cloud sync, ensuring privacy and offline functionality.

## Usage

1. **Add Links**: Use the "Add Link" command to save URLs with aliases.
2. **Search Links**: Use the "Search Links" command with fuzzy search to find and open links.
3. **Create Actions**: Use "Add Action" to define transformation code (e.g., `url.replace('https://', '')`).
4. **Apply Actions**: From a link, select an action to transform and open the URL.

## Installation

Install via Raycast Store

## Contributing

Feel free to open issues or PRs for improvements.

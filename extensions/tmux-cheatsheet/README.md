# 🔎 Tmux Command Lookup for Raycast

Tmux Command Lookup is a Raycast extension built with TypeScript and React that provides a comprehensive, searchable cheatsheet for tmux commands. The extension groups commands by category (e.g., Session Commands, Window Commands, Pane Commands, etc.) and displays detailed information about each command, including the terminal syntax and default keyboard shortcuts.

## Features

- **Grouped Command List**  
  When launching the extension with no search text, commands are organized by category:
  - Session Commands
  - Window Commands
  - Pane Commands
  - Resize Commands
  - Copy/Paste Commands
  - Layout & Options
  - Miscellaneous Commands

- **Flat Search View**  
  As soon as you start typing in the search bar, the extension displays a flat, filtered list of commands matching your query.

- **Detailed Command View**  
  Select a command to view its details in a Markdown-formatted view that includes:
  - The terminal command in a code block
  - Keyboard shortcuts and usage instructions
  - Helpful tips for remapping the tmux prefix

- **Copy to Clipboard**  
  Easily copy any command to your clipboard with a single click.

## File Structure
```
extension/
├── src/ 
│    ├── CommandDetail.tsx   # Displays detailed command info using Markdown 
│    ├── tmux-cheatsheet.tsx # Main entry point that groups commands by category or search 
│    └── tmuxCommands.ts     # Contains tmux commands, their descriptions, and categories
├── package.json             # Project configuration and dependencies
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Usage:

##### Viewing Commands:
Launch the extension from Raycast. With no search text entered, commands are grouped by category.

##### Searching Commands:
Start typing in the search bar to see a flat, filtered list of commands that match your query.

##### Viewing Details:
Select a command to open a detailed view showing the terminal command, keyboard shortcut, and usage instructions.

##### Copying Commands:
In the detail view, click the Copy Command action to copy the tmux command to your clipboard.

## Customization:

##### Adding or Updating Commands:
Edit the tmuxCommands.ts file to add, remove, or modify tmux commands. Each command includes:
id
command (the terminal command)
description (with keyboard shortcuts and usage)
category (for grouping)
##### UI Adjustments:
Modify CommandDetail.tsx to change how command details are displayed. The component uses Markdown, so you can easily tweak headers, code blocks, and other formatting.
## Contributing

Contributions are welcome! If you have improvements or additional tmux commands to suggest, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

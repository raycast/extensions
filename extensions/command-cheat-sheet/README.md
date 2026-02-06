# Command Cheat Sheet

A Raycast extension for searching keyboard shortcuts and commands across multiple tools. Supports fuzzy searching to quickly find the commands you need.

## Features

- **Fuzzy Search** - Type partial commands to find what you need (e.g., `nvim wrap` finds "toggle word wrap")
- **Multi-tool Support** - Organize shortcuts by tool (git, nvim, tmux, etc.)
- **Quick Copy** - Copy shortcut keys or full entries to clipboard
- **Easy to Extend** - Add new tools by creating a simple JSON file

## Usage

1. Open Raycast (default: `cmd+space`)
2. Type `which` to open the Command Cheat Sheet
3. Search for commands using:
   - **Tool name**: `git`, `nvim`
   - **Shortcut keys**: `gst`, `leader`
   - **Description**: `commit`, `wrap`
   - **Multi-word**: `nvim wrap`, `git commit`

4. Press `Enter` to copy the shortcut keys, or use the action menu for more options

## Development Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Raycast (macOS)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. The extension will appear in Raycast - type `which` to test

### Available Commands

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix linting issues

## Adding New Commands

### 1. Create a Tool File

Create a new JSON file in the `shortcuts/` directory for your tool:

```bash
# Example: shortcuts/tmux.json
```

### 2. Format

Each tool file should be a JSON array with `keys` and `description` fields:

```json
[
  {
    "keys": "prefix c",
    "description": "create new window"
  },
  {
    "keys": "prefix n",
    "description": "next window"
  }
]
```

### 3. Register the Tool

Edit `src/which.tsx` and add two things:

**Import the file** (at the top with other imports):
```tsx
import tmuxShortcuts from "../shortcuts/tmux.json";
```

**Add to loadShortcuts()** (in the function):
```tsx
// Load tmux shortcuts
tmuxShortcuts.forEach((shortcut: any) => {
  allShortcuts.push({
    tool: "tmux",
    keys: shortcut.keys,
    description: shortcut.description,
  });
});
```

### 4. Test

Run `npm run dev` and search for your new tool's commands.

## Project Structure

```
.
├── src/
│   └── which.tsx              # Main component
├── shortcuts/
│   ├── git.json               # Git aliases
│   └── nvim.json              # Neovim keybindings
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Tips

- Keep descriptions concise and descriptive
- Use lowercase for consistency
- Group related commands in the same file
- Test fuzzy search with multi-word queries
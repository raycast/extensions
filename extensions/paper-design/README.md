# Paper Design

Browse recent Paper designs, create new files, and manage design tokens directly from Raycast.

Paper Design is a focused Raycast companion for Paper Desktop. It lets you browse and open files, create files in the active team, and manage design tokens without leaving Raycast.

## Features

| Command              | Description                                                                          |
| :------------------- | :----------------------------------------------------------------------------------- |
| Search Recent Files  | Browse, search, and open files Paper Desktop reports as open or recent.              |
| Create File          | Create a named file in the active Paper team and open it in Paper Desktop.           |
| Manage Design Tokens | Browse, copy, create, edit, or delete design tokens in an open or recent Paper file. |

Design token support includes colors, typography, spacing, radius, breakpoints, and containers. Token values can reference another token using `var(--token-name)`.

## How It Works

The extension connects directly to Paper Desktop's local MCP endpoint at `http://127.0.0.1:29979/mcp`. Its requests stay on your Mac. The extension does not collect credentials, include analytics, or send Paper data to an external service.

Raycast AI MCP installation is not required. If you separately want Raycast AI to use Paper's MCP tools, configure the same local endpoint through Raycast's **Install MCP Server** command.

## Requirements

- Raycast for macOS.
- Paper Desktop must remain open with at least one Paper file loaded while using the extension.
- Files must be open or recent in the active Paper team to appear in Recent Files and the design-token file picker.

No Paper account, API key, or Raycast preference is required.

_Paper Design is an independent Raycast extension and is not affiliated with or endorsed by Paper Desktop._

## Contributing

**Via Raycast (recommended):**

1. Use the "Fork Extension" action in Raycast's root search
2. Run `npm install && npm run dev` from the extension folder

When submitting changes, add yourself to contributors in `package.json` and update `CHANGELOG.md`.

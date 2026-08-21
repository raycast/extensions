# Raycast Manifest & Command Architecture (`package.json`)

The extension manifest is defined in `package.json` under standard Raycast fields and validated against the Raycast schema (`https://www.raycast.com/schemas/extension.json`).

## Root Manifest Structure

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "extension-slug",
  "title": "Extension Title",
  "description": "Clear and concise extension summary (1-2 sentences)",
  "icon": "extension-icon.png",
  "author": "raycast_username",
  "platforms": ["macOS", "Windows"],
  "categories": ["Productivity", "Developer Tools"],
  "license": "MIT",
  "commands": [],
  "tools": [],
  "preferences": [],
  "dependencies": {
    "@raycast/api": "^1.104.20",
    "@raycast/utils": "^2.2.7"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "22.19.17",
    "@types/react": "19.0.10",
    "eslint": "^10.5.0",
    "prettier": "^3.8.5",
    "typescript": "^6.0.3"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

---

## Command Modes & Types

Each command inside `"commands": [...]` maps to a file in `src/` whose basename matches `"name"`.

### 1. `view` Commands (Interactive UI)
Opens full Raycast window with a React view (`List`, `Detail`, `Form`, `Grid`).

```json
{
  "name": "search-repositories",
  "title": "Search Repositories",
  "subtitle": "GitHub",
  "description": "Search and inspect GitHub repositories",
  "mode": "view"
}
```

### 2. `no-view` Commands (Background / Action Only)
Executes a background script without showing a main window. Can trigger notifications, copy to clipboard, or show a HUD/Toast.

```json
{
  "name": "empty-trash",
  "title": "Empty Trash",
  "description": "Quickly empty trash and report reclaimed space",
  "mode": "no-view"
}
```

Periodic background execution can be configured with `"interval"`:
```json
{
  "name": "sync-notifications",
  "title": "Sync Notifications",
  "description": "Background sync for unread items",
  "mode": "no-view",
  "interval": "30m"
}
```
*Allowed interval values:* `"1m"`, `"5m"`, `"15m"`, `"30m"`, `"1h"`, `"3h"`, `"6h"`, `"12h"`, `"1d"`.

### 3. `menu-bar` Commands (macOS Menu Bar)
Renders a menu bar item using `<MenuBarExtra>`.

```json
{
  "name": "system-monitor",
  "title": "System Monitor",
  "description": "Live CPU and RAM usage in the menu bar",
  "mode": "menu-bar",
  "interval": "1m"
}
```

---

## Command Arguments

Prompt user for input in the Raycast search bar before launching the command.

```json
{
  "name": "quick-note",
  "title": "Quick Note",
  "description": "Add a fast note to Obsidian",
  "mode": "no-view",
  "arguments": [
    {
      "name": "note",
      "placeholder": "Meeting notes...",
      "type": "text",
      "required": true
    },
    {
      "name": "tag",
      "placeholder": "work",
      "type": "text",
      "required": false
    }
  ]
}
```

In the command handler (`src/quick-note.ts`):
```tsx
import { LaunchProps, showHUD } from "@raycast/api";

interface NoteArguments {
  note: string;
  tag?: string;
}

export default async function Command(props: LaunchProps<{ arguments: NoteArguments }>) {
  const { note, tag } = props.arguments;
  // Execution logic
  await showHUD(`Note saved: ${note}`);
}
```

---

## Preferences Architecture

Preferences can be configured at **Extension level** (applies across all commands) or **Command level** (isolated to a single command).

### Preference Types:
- `textfield`: Standard text string
- `password`: Masked input for API keys and tokens (stored securely in macOS Keychain)
- `checkbox`: Boolean flag
- `dropdown`: Select list from predefined items
- `file`: File path picker
- `directory`: Folder path picker
- `app`: Application selector

### Manifest Example:
```json
"preferences": [
  {
    "name": "apiToken",
    "title": "API Token",
    "description": "Your Personal Access Token",
    "type": "password",
    "required": true
  },
  {
    "name": "defaultWorkspace",
    "title": "Default Workspace",
    "description": "Select workspace for new tickets",
    "type": "dropdown",
    "required": false,
    "default": "engineering",
    "data": [
      { "title": "Engineering", "value": "engineering" },
      { "title": "Product", "value": "product" },
      { "title": "Design", "value": "design" }
    ]
  },
  {
    "name": "autoRefresh",
    "title": "Auto-Refresh Data",
    "label": "Enable 15m polling",
    "description": "Periodically poll server for new updates",
    "type": "checkbox",
    "required": false,
    "default": true
  }
]
```

### TypeScript Preference Getter:
```tsx
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
  defaultWorkspace?: string;
  autoRefresh?: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
```

---

## AI Tools Manifest (`tools`)

Raycast AI Extensions can register tools callable by Raycast AI chat.

```json
"tools": [
  {
    "name": "search-issues",
    "title": "Search Issues",
    "description": "Search project tickets and issues by query, status, or assignee",
    "params": {
      "query": {
        "type": "string",
        "description": "Search terms to match in issue title or body",
        "required": true
      },
      "status": {
        "type": "string",
        "description": "Filter by status e.g. open, in_progress, closed",
        "required": false
      }
    }
  }
]
```

Corresponding implementation in `src/tools/search-issues.ts`:
```typescript
interface Input {
  query: string;
  status?: string;
}

export default async function (input: Input) {
  // Return plain JSON or string payload to Raycast AI
  return { results: [...] };
}
```

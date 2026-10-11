---
name: raycast-extension
description: Build Raycast extensions with React and TypeScript. Use when the user asks to create a Raycast extension, command, or tool.
---

# Raycast Extension Development

## Quick Start

1. Create project structure
2. Write package.json with extension config
3. Implement command in src/
4. Run `npm install && npm run dev`

## Project Structure

```
my-extension/
├── package.json          # Extension manifest + dependencies
├── tsconfig.json         # TypeScript config
├── .eslintrc.json        # ESLint config
├── raycast-env.d.ts      # Type definitions (auto-generated)
├── assets/
│   └── extension-icon.png  # 512x512 PNG icon
└── src/
    └── command-name.tsx    # Command implementation
```

## package.json Template

```json
{
  "name": "extension-name",
  "title": "Extension Title",
  "description": "What this extension does",
  "icon": "extension-icon.png",
  "author": "author-name",
  "categories": ["Productivity", "Developer Tools"],
  "license": "MIT",
  "commands": [
    {
      "name": "command-name",
      "title": "Command Title",
      "description": "What this command does",
      "mode": "view",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.83.1",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/node": "22.5.4",
    "@types/react": "18.3.3",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3",
    "typescript": "^5.5.4"
  },
  "scripts": {
    "build": "ray build --skip-types -e dist -o dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint"
  }
}
```

## Command Modes

| Mode | Use Case |
|------|----------|
| `view` | Show UI with Detail, List, Form, Grid |
| `no-view` | Background task, clipboard, notifications only |
| `menu-bar` | Menu bar icon with dropdown |

## Hotkey Configuration

Add to command in package.json:
```json
"hotkey": {
  "modifiers": ["opt"],
  "key": "m"
}
```

Modifiers: `cmd`, `opt`, `ctrl`, `shift`

**Note**: Hotkeys in package.json are suggestions. Users set them in Raycast Preferences → Extensions.

## tsconfig.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "lib": ["ES2022"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  },
  "include": ["src/**/*", "raycast-env.d.ts"]
}
```

## .eslintrc.json

```json
{
  "root": true,
  "extends": ["@raycast"]
}
```

## Command Patterns

### No-View Command (Background Task)

```tsx
import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Working...",
  });

  try {
    // Do work
    const result = await doSomething();

    await Clipboard.copy(result);
    await showHUD("✅ Done!");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
```

### View Command (List)

```tsx
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content="text" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### View Command (Detail)

```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `# Hello World`;
  return <Detail markdown={markdown} />;
}
```

## Performance & Caching

### Instant Load Pattern (No Empty Flash)

Use synchronous cache read + async refresh for instant perceived load:

```tsx
import { List, Cache } from "@raycast/api";
import { useCachedPromise, withCache } from "@raycast/utils";

const cache = new Cache();
const CACHE_KEY = "myData";

// Read cache synchronously at module load (before React renders)
function getInitialData(): MyData[] {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

// Expensive async operation wrapped with withCache (5 min TTL)
const fetchExpensiveData = withCache(
  async () => {
    // Your expensive operation here
    return await someSlowOperation();
  },
  { maxAge: 5 * 60 * 1000 }
);

async function fetchAllData(): Promise<MyData[]> {
  const data = await fetchExpensiveData();
  // Update cache for next launch
  cache.set(CACHE_KEY, JSON.stringify(data));
  return data;
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchAllData, [], {
    initialData: getInitialData(), // Sync read - instant render!
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading && !data?.length}>
      {data?.map(item => <List.Item key={item.id} title={item.name} />)}
    </List>
  );
}
```

### Key Caching Utilities

| Utility | Purpose |
|---------|---------|
| `Cache` | Persistent disk cache, sync read/write |
| `withCache(fn, {maxAge})` | Wrap async functions with TTL cache |
| `useCachedPromise` | Stale-while-revalidate pattern |
| `LocalStorage` | Async key-value storage |

### Avoiding CLS (Content Layout Shift)

Load all data in ONE async function:

```tsx
// BAD - causes layout shift
const [customData, setCustomData] = useState([]);
useEffect(() => {
  loadCustomData().then(setCustomData); // Second render!
}, []);

// GOOD - single fetch, no shift
async function fetchAllData() {
  const [dataA, dataB] = await Promise.all([
    fetchDataA(),
    fetchDataB(),
  ]);
  return combineData(dataA, dataB);
}
```

### Non-Blocking Operations (Prevent UI Freeze)

**Root cause of "tiny delay"**: Sync operations (`execSync`, `statSync`, `readdirSync`) block the event loop during revalidation, freezing the UI even with cached data displayed.

```tsx
// BAD - blocks event loop, UI freezes during revalidation
import { execSync } from "child_process";
import { statSync, readdirSync, copyFileSync } from "fs";

function fetchData() {
  copyFileSync(src, dest);                    // Blocks!
  const result = execSync("sqlite3 query");   // Blocks!
  const entries = readdirSync(dir);           // Blocks!
  for (const entry of entries) {
    statSync(join(dir, entry));               // Blocks N times!
  }
}

// GOOD - fully async, UI renders cached data while refreshing
import { exec } from "child_process";
import { promisify } from "util";
import { stat, readdir, copyFile, access } from "fs/promises";

const execAsync = promisify(exec);

async function fetchData() {
  await copyFile(src, dest);                         // Non-blocking
  const { stdout } = await execAsync("sqlite3...");  // Non-blocking

  // Use withFileTypes to avoid extra stat calls
  const entries = await readdir(dir, { withFileTypes: true });
  const results = entries
    .filter(e => e.isDirectory())  // No stat needed!
    .map(e => ({ path: join(dir, e.name), name: e.name }));
}
```

**Key optimizations:**
1. Replace `execSync` with `promisify(exec)` for shell commands
2. Replace `existsSync` with `access()` from `fs/promises`
3. Replace `readdirSync` + `statSync` loop with `readdir(dir, { withFileTypes: true })`
4. Run all path validations in parallel with `Promise.all`
5. Use SQLite URI mode for direct read-only access (no file copy needed)

### SQLite Direct Access (Skip File Copy)

When reading SQLite databases from other apps (like Zed, VS Code, etc.), avoid copying the database file. Use URI mode for direct read-only access:

```tsx
// BAD - copies entire database file (slow, blocks)
import { copyFileSync, unlinkSync } from "fs";

const tempDb = `/tmp/copy-${Date.now()}.sqlite`;
copyFileSync(originalDb, tempDb);           // Expensive!
execSync(`sqlite3 "${tempDb}" "SELECT..."`);
unlinkSync(tempDb);                         // Cleanup

// GOOD - direct read-only access via URI mode
const uri = `file:${originalDb}?mode=ro&immutable=1`;
const { stdout } = await execAsync(`sqlite3 "${uri}" "SELECT..."`);
```

**URI parameters:**
- `mode=ro` - Read-only mode, no write locks acquired
- `immutable=1` - Skip WAL/lock checks, treat file as immutable

This eliminates the file copy entirely, saving significant I/O time.

### execFile vs exec (Bypass Shell)

`exec` spawns a shell (~20ms overhead), `execFile` calls binary directly (~4ms):

```tsx
// BAD - spawns shell, parses command string
import { exec } from "child_process";
const execAsync = promisify(exec);
await execAsync(`sqlite3 -separator '|||' "${db}" "${query}"`);

// GOOD - direct binary execution, ~16ms faster
import { execFile } from "child_process";
const execFileAsync = promisify(execFile);
await execFileAsync("sqlite3", ["-separator", "|||", db, query]);
```

### Sidecar Pattern (True Background Preloading)

For truly instant cold starts, use a background worker to pre-warm the cache before the user opens the extension.

**The Problem:** `view` commands cannot use `interval` (background scheduling). Only `no-view` and `menu-bar` modes support it.

**The Solution:** Create two commands that share the same cache:

```json
// package.json
{
  "commands": [
    {
      "name": "main",
      "title": "My Extension",
      "mode": "view"
    },
    {
      "name": "background-sync",
      "title": "Background Sync",
      "mode": "no-view",
      "interval": "15m"
    }
  ]
}
```

```tsx
// shared-cache.ts - both commands import this
import { Cache } from "@raycast/api";
export const sharedCache = new Cache(); // Shared across extension

// background-sync.tsx (no-view worker)
import { sharedCache } from "./shared-cache";
export default async function Command() {
  const data = await fetchExpensiveData();
  sharedCache.set("projects", JSON.stringify(data));
}

// main.tsx (view command)
import { sharedCache } from "./shared-cache";
function getInitialData() {
  const cached = sharedCache.get("projects");
  return cached ? JSON.parse(cached) : [];
}
export default function Command() {
  const { data } = useCachedPromise(fetchData, [], {
    initialData: getInitialData(), // Instant from pre-warmed cache!
  });
}
```

**Key points:**
- Worker runs silently on interval, user never sees it
- Both commands share the same `Cache` (scoped to extension, not command)
- View command reads synchronously from pre-warmed cache
- Use `15m` to `1h` intervals to avoid battery/rate-limit issues

### Large Datasets: useSQL over JSON Cache

For >1,000 items, use SQLite instead of JSON cache for instant filtering:

```tsx
// BAD - loads entire 10MB JSON into memory to filter
const allProjects = JSON.parse(cache.get("projects"));
const filtered = allProjects.filter(p => p.name.includes(query));

// GOOD - SQLite queries only matching rows
import { useSQL } from "@raycast/utils";
const { data } = useSQL(dbPath, `SELECT * FROM projects WHERE name LIKE ?`, [`%${query}%`]);
```

### Optimistic UI (Instant Actions)

For write operations, update UI immediately before API confirms:

```tsx
const { mutate } = useCachedPromise(fetchItems);

async function deleteItem(id: string) {
  await mutate(deleteItemAPI(id), {
    optimisticUpdate: (current) => current.filter(i => i.id !== id),
    rollbackOnError: true, // Revert if API fails
  });
}
```

User sees instant feedback; rollback happens automatically on failure.

```tsx
// BAD - sequential stat calls
const entries = readdirSync(dir);
for (const entry of entries) {
  const s = statSync(join(dir, entry));  // N blocking calls
}

// GOOD - parallel async checks
const checkPath = async (p: string) => {
  try {
    const s = await stat(p);
    return s.isDirectory() ? p : null;
  } catch { return null; }
};

const results = await Promise.all(paths.map(checkPath));
```

## Common APIs

### Clipboard

```tsx
import { Clipboard } from "@raycast/api";

await Clipboard.copy("text");
await Clipboard.paste("text");
const text = await Clipboard.readText();
```

### Notifications

```tsx
import { showHUD, showToast, Toast } from "@raycast/api";

// Quick notification (disappears)
await showHUD("Done!");

// Toast with progress
const toast = await showToast({
  style: Toast.Style.Animated,
  title: "Loading...",
});
toast.style = Toast.Style.Success;
toast.title = "Complete";
```

### AppleScript (macOS Integration)

```tsx
import { runAppleScript } from "@raycast/utils";

// Get Chrome active tab URL
const url = await runAppleScript(`
  tell application "Google Chrome"
    return URL of active tab of front window
  end tell
`);

// Get Safari URL
const safariUrl = await runAppleScript(`
  tell application "Safari"
    return URL of current tab of front window
  end tell
`);

// Get frontmost app
const app = await runAppleScript(`
  tell application "System Events"
    return name of first application process whose frontmost is true
  end tell
`);
```

### Fetch Data

```tsx
// Native fetch works
const response = await fetch("https://api.example.com/data");
const data = await response.json();
```

### Preferences

In package.json:
```json
"preferences": [
  {
    "name": "apiKey",
    "type": "password",
    "required": true,
    "title": "API Key",
    "description": "Your API key"
  }
]
```

In code:
```tsx
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

const { apiKey } = getPreferenceValues<Preferences>();
```

## Creating Extension Icon

Use ImageMagick:
```bash
convert -size 512x512 xc:'#6366F1' -fill white -gravity center \
  -font Helvetica-Bold -pointsize 280 -annotate +0+20 'M' \
  assets/extension-icon.png
```

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Lint and fix
npm run fix-lint

# Build for production
npm run build
```

## Raycast Deeplinks

Trigger Raycast commands programmatically via URL scheme:

```bash
# Reload all extensions
open "raycast://extensions/raycast/raycast/reload-extensions"

# Open Raycast
open "raycast://focus"

# Run any extension command
open "raycast://extensions/{author}/{extension}/{command}"
```

### Auto-reload after build

Add to package.json scripts:
```json
"build": "ray build --skip-types -e dist -o dist && open raycast://extensions/raycast/raycast/reload-extensions"
```

Or create a reload script:
```bash
#!/bin/bash
npm run build && open "raycast://extensions/raycast/raycast/reload-extensions"
```

## Testing in Raycast

1. Run `npm run dev` (provides hot reload)
2. Open Raycast
3. Search for your command name
4. Press Enter to run

Without dev server running, use deeplink to reload after changes:
```bash
npm run build && open "raycast://extensions/raycast/raycast/reload-extensions"
```

## Publishing

```bash
npm run publish
```

Submits to Raycast Store for review.

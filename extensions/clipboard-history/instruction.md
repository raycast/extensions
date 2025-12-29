Here’s a complete design for your clipboard-history extension, including the exact keyboard shortcuts you want.

---

### 1. Extension manifest (`package.json`)

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "clipboard-history",
  "title": "Clipboard History",
  "description": "Restore any previous clipboard entry with a hotkey",
  "icon": "📋",
  "author": "you",
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Browse History",
      "description": "Pick an entry to restore",
      "mode": "view"
    },
    {
      "name": "restore-1",
      "title": "Restore 1st Previous",
      "description": "Restore the most-recent history item",
      "mode": "no-view",
      "key": "cmd+shift+1"
    },
    {
      "name": "restore-2",
      "title": "Restore 2nd Previous",
      "description": "Restore the 2nd history item",
      "mode": "no-view",
      "key": "cmd+shift+2"
    },
    {
      "name": "restore-3",
      "title": "Restore 3rd Previous",
      "description": "Restore the 3rd history item",
      "mode": "no-view",
      "key": "cmd+shift+3"
    },
    {
      "name": "restore-4",
      "title": "Restore 4th Previous",
      "description": "Restore the 4th history item",
      "mode": "no-view",
      "key": "cmd+shift+4"
    }
  ],
  "preferences": [
    {
      "name": "maxItems",
      "type": "textfield",
      "title": "Max history items",
      "default": "50"
    },
    {
      "name": "pollInterval",
      "type": "textfield",
      "title": "Poll interval (ms)",
      "default": "500"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.84.0",
    "@raycast/utils": "^1.17.0"
  }
}
```

---

### 2. Core module (`src/clipboard.ts`)

Keeps an in-memory ring buffer and persists to `LocalStorage`.

```typescript
import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "history";
const MAX_ITEMS = Number(await LocalStorage.getItem("maxItems") || 50);

type Entry = { text: string; timestamp: number };

let history: Entry[] = [];

export async function loadHistory(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  history = raw ? (JSON.parse(raw) as Entry[]) : [];
}

export async function saveHistory(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function add(text: string): void {
  if (!text.trim()) return;
  // dedupe against head
  if (history[0]?.text === text) return;
  history.unshift({ text, timestamp: Date.now() });
  if (history.length > MAX_ITEMS) history.pop();
  saveHistory();
}

export function get(index: number): string | undefined {
  return history[index]?.text;
}

export function list(): Entry[] {
  return [...history];
}
```

---

### 3. Watcher (`src/watcher.ts`)

Polls the clipboard and pushes new text.

```typescript
import { Clipboard, closeMainWindow } from "@raycast/api";
import { add } from "./clipboard";

const POLL_MS = Number(await LocalStorage.getItem("pollInterval") || 500);
let last = "";

export function start() {
  closeMainWindow(); // run in background
  setInterval(async () => {
    const text = await Clipboard.readText();
    if (text && text !== last) {
      last = text;
      add(text);
    }
  }, POLL_MS);
}
```

Call `start()` from `src/clipboard-history.tsx` or a separate “Enable Watcher” command.

---

### 4. Browse & pick UI (`src/index.tsx`)

```typescript
import { List, ActionPanel, Action } from "@raycast/api";
import { list, loadHistory } from "./clipboard";
import { setClipboard } from "./utils";

export default function Command() {
  const entries = list();
  return (
    <List isLoading={false} onAction={() => {}}>
      {entries.map((e, i) => (
        <List.Item
          key={i}
          title={e.text}
          subtitle={`${i + 1}  |  ${new Date(e.timestamp).toLocaleTimeString()}`}
          actions={
            <ActionPanel>
              <Action
                title="Restore to Clipboard"
                onAction={() => setClipboard(e.text)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

loadHistory();
```

---

### 5. Hot-key commands (`src/restore-1.ts` … `restore-4.ts`)

All identical except for the index.

```typescript
// src/restore-2.ts  (2nd oldest → index 1)
import { showHUD } from "@raycast/api";
import { get, loadHistory } from "./clipboard";
import { setClipboard } from "./utils";

export default async function () {
  await loadHistory();
  const text = get(1); // 0 = newest, 1 = second newest
  if (!text) return showHUD("No history");
  await setClipboard(text);
  showHUD("Restored #2");
}
```

Repeat for `restore-1.ts` (index 0), `restore-3.ts` (index 2), `restore-4.ts` (index 3).

---

### 6. Utility (`src/utils.ts`)

```typescript
import { Clipboard } from "@raycast/api";
export async function setClipboard(text: string) {
  await Clipboard.copy(text);
}
```

---

### 7. Installation & usage

1. `npm install`  
2. `npm run dev` → open Raycast → “Browse History” to verify.  
3. Copy some text, then press `Cmd+Shift+2` (etc.) to restore earlier items.  
4. Adjust *Max history items* or *Poll interval* in Raycast → Extensions → Clipboard History → Settings.

That’s it—your clipboard history is now one keystroke away.

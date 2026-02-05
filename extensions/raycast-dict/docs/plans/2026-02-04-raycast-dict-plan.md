# Raycast Dictionary Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Raycast extension that looks up word definitions from macOS installed dictionaries with real-time completions as the user types.

**Architecture:** Swift CLI helper binary (`dict-helper`) handles dictionary access via `DCSCopyTextDefinition` and `NSSpellChecker`. Raycast extension (TypeScript/React) provides the UI with a `List` + detail panel. Two subprocess calls per keystroke: one for completions, one batch for definitions.

**Tech Stack:** Swift 5, TypeScript, React, @raycast/api, @raycast/utils, child_process/execFile

---

### Task 1: Scaffold Raycast Extension

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.tsx` (minimal placeholder)

**Step 1: Initialize git repo**

Run: `cd /Users/ellin/code/raycast-dict && git init`

**Step 2: Create package.json**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "raycast-dict",
  "title": "Dictionary",
  "description": "Look up word definitions using macOS system dictionaries",
  "icon": "extension-icon.png",
  "author": "ellin",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Look Up Word",
      "description": "Search for word definitions in system dictionaries",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.37.0",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.0.4",
    "@types/node": "22.13.10",
    "@types/react": "19.0.10",
    "eslint": "^9.22.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.2"
  },
  "scripts": {
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "build": "ray build",
    "build-swift": "swiftc -O -o assets/dict-helper swift/DictHelper.swift",
    "prebuild": "npm run build-swift",
    "predev": "npm run build-swift"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2023",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
.raycast/
dist/
assets/dict-helper
```

**Step 5: Create placeholder src/index.tsx**

```tsx
import { List } from "@raycast/api";

export default function Command() {
  return <List searchBarPlaceholder="Look up a word..." />;
}
```

**Step 6: Create assets directory with placeholder icon**

Run: `mkdir -p /Users/ellin/code/raycast-dict/assets /Users/ellin/code/raycast-dict/swift /Users/ellin/code/raycast-dict/src`

Copy a 512x512 PNG as `assets/extension-icon.png` (or create a placeholder).

**Step 7: Install dependencies**

Run: `cd /Users/ellin/code/raycast-dict && npm install`

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold raycast extension"
```

---

### Task 2: Build Swift CLI Helper

**Files:**
- Create: `swift/DictHelper.swift`

**Step 1: Write the Swift helper**

```swift
import Foundation
import CoreServices

// MARK: - Dictionary Services (private API)
@_silgen_name("DCSGetTermRangeInString")
func DCSGetTermRangeInString(_ dictionary: DCSDictionary?, _ string: CFString, _ offset: CFIndex) -> CFRange

@_silgen_name("DCSCopyTextDefinition")
func DCSCopyTextDefinition(_ dictionary: DCSDictionary?, _ string: CFString, _ range: CFRange) -> CFString?

// MARK: - NSSpellChecker completions
func getCompletions(prefix: String, maxResults: Int = 20) -> [String] {
    let checker = NSSpellChecker.shared
    let range = NSRange(location: 0, length: prefix.utf16.count)
    let language = checker.language()
    let completions = checker.completions(
        forPartialWordRange: range,
        in: prefix,
        language: language,
        inSpellDocumentWithTag: 0
    ) ?? []
    return Array(completions.prefix(maxResults))
}

// MARK: - Dictionary lookup
func getDefinition(word: String) -> [[String: String]] {
    let cfWord = word as CFString
    let range = CFRangeMake(0, CFStringGetLength(cfWord))
    var results: [[String: String]] = []

    if let definition = DCSCopyTextDefinition(nil, cfWord, range) {
        results.append([
            "dict": "Default",
            "word": word,
            "definition": definition as String
        ])
    }

    return results
}

// MARK: - List installed dictionaries
func listDictionaries() -> [[String: String]] {
    // DCSCopyTextDefinition with nil dictionary uses all available dictionaries
    // We report what we can access
    return [["id": "default", "name": "All Dictionaries"]]
}

// MARK: - Main
let args = CommandLine.arguments

guard args.count >= 2 else {
    let usage = """
    Usage:
      dict-helper define <word1> [word2 ...]
      dict-helper complete <prefix>
      dict-helper list
    """
    FileHandle.standardError.write(usage.data(using: .utf8)!)
    exit(1)
}

let command = args[1]

switch command {
case "define":
    guard args.count >= 3 else {
        FileHandle.standardError.write("Error: define requires at least one word\n".data(using: .utf8)!)
        exit(1)
    }
    let words = Array(args[2...])
    var allResults: [[String: String]] = []
    for word in words {
        allResults.append(contentsOf: getDefinition(word: word))
    }
    let json = try! JSONSerialization.data(withJSONObject: allResults, options: [])
    print(String(data: json, encoding: .utf8)!)

case "complete":
    guard args.count >= 3 else {
        FileHandle.standardError.write("Error: complete requires a prefix\n".data(using: .utf8)!)
        exit(1)
    }
    let prefix = args[2]
    let completions = getCompletions(prefix: prefix)
    let json = try! JSONSerialization.data(withJSONObject: completions, options: [])
    print(String(data: json, encoding: .utf8)!)

case "list":
    let dicts = listDictionaries()
    let json = try! JSONSerialization.data(withJSONObject: dicts, options: [])
    print(String(data: json, encoding: .utf8)!)

default:
    FileHandle.standardError.write("Unknown command: \(command)\n".data(using: .utf8)!)
    exit(1)
}
```

**Step 2: Compile and test**

Run: `cd /Users/ellin/code/raycast-dict && swiftc -O -o assets/dict-helper swift/DictHelper.swift`

Test:
- `./assets/dict-helper complete hel` - should return JSON array of completions
- `./assets/dict-helper define hello` - should return JSON array with definition
- `./assets/dict-helper list` - should return JSON array of dictionaries

**Step 3: Commit**

```bash
git add swift/DictHelper.swift
git commit -m "feat: add Swift CLI helper for dictionary access"
```

---

### Task 3: Build dict-helper TypeScript Wrapper

**Files:**
- Create: `src/dict-helper.ts`

**Step 1: Write the wrapper module**

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import path from "node:path";

const execFileAsync = promisify(execFile);

const HELPER_PATH = path.join(environment.assetsPath, "dict-helper");

export interface DictResult {
  dict: string;
  word: string;
  definition: string;
}

export interface DictInfo {
  id: string;
  name: string;
}

export async function define(words: string[]): Promise<DictResult[]> {
  if (words.length === 0) return [];
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["define", ...words], {
      timeout: 5000,
    });
    return JSON.parse(stdout) as DictResult[];
  } catch {
    return [];
  }
}

export async function complete(prefix: string): Promise<string[]> {
  if (!prefix.trim()) return [];
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["complete", prefix], {
      timeout: 3000,
    });
    return JSON.parse(stdout) as string[];
  } catch {
    return [];
  }
}

export async function listDictionaries(): Promise<DictInfo[]> {
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["list"], {
      timeout: 3000,
    });
    return JSON.parse(stdout) as DictInfo[];
  } catch {
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add src/dict-helper.ts
git commit -m "feat: add TypeScript wrapper for dict-helper binary"
```

---

### Task 4: Build Language Detection Module

**Files:**
- Create: `src/language-detect.ts`

**Step 1: Write the character-set heuristic**

```typescript
export type ScriptType = "latin" | "cyrillic" | "cjk" | "arabic" | "devanagari" | "unknown";

export function detectScript(text: string): ScriptType {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";

  // Count characters in each script range
  let latin = 0;
  let cyrillic = 0;
  let cjk = 0;
  let arabic = 0;
  let devanagari = 0;

  for (const char of trimmed) {
    const code = char.codePointAt(0)!;
    if ((code >= 0x0041 && code <= 0x024f) || (code >= 0x1e00 && code <= 0x1eff)) {
      latin++;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      cyrillic++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk++;
    } else if (code >= 0x0600 && code <= 0x06ff) {
      arabic++;
    } else if (code >= 0x0900 && code <= 0x097f) {
      devanagari++;
    }
  }

  const counts: [ScriptType, number][] = [
    ["latin", latin],
    ["cyrillic", cyrillic],
    ["cjk", cjk],
    ["arabic", arabic],
    ["devanagari", devanagari],
  ];

  const max = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return max[1] > 0 ? max[0] : "unknown";
}
```

**Step 2: Commit**

```bash
git add src/language-detect.ts
git commit -m "feat: add character-set language detection"
```

---

### Task 5: Build Main Extension UI

**Files:**
- Modify: `src/index.tsx`

**Step 1: Implement the full List + Detail view**

```tsx
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { define, complete, DictResult } from "./dict-helper";

interface WordEntry {
  word: string;
  definitions: DictResult[];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!searchText.trim()) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const signal = abortRef.current.signal;

    (async () => {
      try {
        // Get completions
        const completions = await complete(searchText);
        if (signal.aborted) return;

        // Include the search text itself if not already in completions
        const words = [searchText, ...completions.filter((c) => c.toLowerCase() !== searchText.toLowerCase())];
        const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))].map(
          (lower) => words.find((w) => w.toLowerCase() === lower)!
        );

        // Batch define all words
        const definitions = await define(uniqueWords);
        if (signal.aborted) return;

        // Group definitions by word
        const byWord = new Map<string, DictResult[]>();
        for (const def of definitions) {
          const key = def.word.toLowerCase();
          if (!byWord.has(key)) byWord.set(key, []);
          byWord.get(key)!.push(def);
        }

        // Build entries - words with definitions first, then suggestions
        const withDefs: WordEntry[] = [];
        const withoutDefs: WordEntry[] = [];
        for (const word of uniqueWords) {
          const defs = byWord.get(word.toLowerCase()) || [];
          if (defs.length > 0) {
            withDefs.push({ word, definitions: defs });
          } else {
            withoutDefs.push({ word, definitions: [] });
          }
        }

        setEntries([...withDefs, ...withoutDefs]);
      } catch {
        // Ignore abort errors
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [searchText]);

  const definedEntries = entries.filter((e) => e.definitions.length > 0);
  const suggestionEntries = entries.filter((e) => e.definitions.length === 0);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Look up a word..."
      isShowingDetail={definedEntries.length > 0}
      throttle
    >
      {definedEntries.length > 0 && (
        <List.Section title="Definitions">
          {definedEntries.map((entry) => (
            <List.Item
              key={entry.word}
              title={entry.word}
              accessories={[{ text: entry.definitions[0].dict }]}
              detail={
                <List.Item.Detail
                  markdown={formatDefinition(entry)}
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Definition"
                    content={entry.definitions.map((d) => d.definition).join("\n\n")}
                  />
                  <Action.OpenInBrowser
                    title="Open in Dictionary"
                    url={`dict://${encodeURIComponent(entry.word)}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Word"
                    content={entry.word}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {suggestionEntries.length > 0 && (
        <List.Section title="Suggestions">
          {suggestionEntries.map((entry) => (
            <List.Item
              key={entry.word}
              title={entry.word}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action
                    title="Look Up"
                    icon={Icon.Book}
                    onAction={() => setSearchText(entry.word)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function formatDefinition(entry: WordEntry): string {
  return entry.definitions
    .map((d) => `## ${d.dict}\n\n${d.definition}`)
    .join("\n\n---\n\n");
}
```

**Step 2: Commit**

```bash
git add src/index.tsx
git commit -m "feat: implement main dictionary lookup UI"
```

---

### Task 6: Compile, Test End-to-End, and Polish

**Step 1: Compile Swift helper**

Run: `cd /Users/ellin/code/raycast-dict && swiftc -O -o assets/dict-helper swift/DictHelper.swift`

**Step 2: Run the extension in dev mode**

Run: `cd /Users/ellin/code/raycast-dict && npm run dev`

Open Raycast, search for "Look Up Word", type a word, verify:
- Word completions appear in the list
- Selecting a word shows its definition in the detail panel
- Actions work (copy, open in Dictionary.app)

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete dictionary extension with end-to-end functionality"
```

# Raycast API reference (excerpts)

Full API: https://developers.raycast.com/llms.txt

## executeSQL (from @raycast/utils)

```ts
function executeSQL(databasePath: string, query: string): Promise<Record<string, unknown>[]>;
```

## runAppleScript (from @raycast/utils, macOS)

```ts
function runAppleScript(
  script: string,
  options?: {
    humanReadableOutput?: boolean;
    language?: "AppleScript" | "JavaScript";
    signal?: AbortSignal;
    timeout?: number;
  },
): Promise<string>;
// Or: runAppleScript(script, args: string[], options?)
```

## List with sections

- `List`, `List.Section`, `List.Item`; optional `List.Item.Detail` + `List` prop `isShowingDetail`.
- `List.Dropdown` as `searchBarAccessory` for day/category picker.

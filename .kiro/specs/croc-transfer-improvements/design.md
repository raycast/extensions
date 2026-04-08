# Design Document: Croc Transfer Improvements

## Overview

This document describes the technical design for a set of improvements to the Croc Transfer Raycast extension. The changes span a bug fix (file renaming on receive), UX enhancements, new features, code quality improvements, and Raycast best-practice alignment.

The extension wraps the `croc` CLI tool. Croc writes all output to `/dev/tty`, so a Python PTY wrapper captures output. Transfer state is managed via React `useState` with union string types. History is persisted in Raycast `LocalStorage`.

The improvements are grouped into four priority tiers (P0–P3) that define implementation order. P0 changes are foundational and must land first because later requirements depend on them.

---

## Architecture

The existing architecture is preserved. No new layers are introduced.

```
src/
├── send-file.tsx           # SendCommand — refactored to use useTransfer hook
├── receive-file.tsx        # ReceiveCommand — form input, no rename, Finder reveal
├── transfer-history.tsx    # HistoryCommand — date groups, accessories, keywords
├── quick-send.ts           # QuickSendCommand (NEW) — no-view, Finder selection
├── components/
│   └── InstallGuide.tsx    # Refresh action + Homebrew install action
├── hooks/
│   ├── useCrocCheck.ts     # Async binary detection (refactored)
│   ├── useTransfer.ts      # Extended: form/zipping states, cancel record writing
│   └── useTransferHistory.ts
└── utils/
    ├── croc.ts             # clearCrocPathCache() exported; buildCrocArgs cleaned up
    ├── history.ts          # formatFileSize() added
    └── process.ts          # renameReceivedFiles removed; computeFileSize added
```

### Key Architectural Decisions

**No new dependencies.** All changes use `@raycast/api`, `@raycast/utils`, and Node.js built-ins only (NFR 3).

**QuickSendCommand is `no-view`.** It cannot use React hooks. It manages its process lifecycle directly via `spawnCrocSend` and communicates via `showHUD`. It uses a **write-ahead approach** for best-effort history on unexpected termination (see `src/quick-send.ts` section below).

**Cache invalidation is explicit.** `getCrocPath` uses a module-level `_resolvedPath` cache. A new `clearCrocPathCache()` export resets it. Every view-mode command calls this on mount. The InstallGuide Refresh action and the Homebrew install action also call it.

**`useTransfer` hook is extended** to cover the `form` and `zipping` states that currently live only in `send-file.tsx`, making it the single source of truth for send state.

---

## Components and Interfaces

### `utils/croc.ts` changes

```typescript
// New export — resets the module-level cache
export function clearCrocPathCache(): void {
  _resolvedPath = null;
}

// buildCrocArgs: remove the misleading extra[] parameter for "receive"
// The code phrase is always passed via CROC_SECRET env var, not args
export function buildCrocArgs(subcommand: "send", extra: string[]): string[];
export function buildCrocArgs(subcommand: "receive"): string[];
export function buildCrocArgs(subcommand: "send" | "receive", extra?: string[]): string[]
```

> **Calling pattern:** The croc binary path is resolved separately via `getCrocPath()`. `buildCrocArgs` returns only the argument array passed to the spawn call. Callers are responsible for combining the path and args when invoking `spawnCrocSend` / `spawnCrocReceive`.

### `utils/process.ts` changes

Remove `renameReceivedFiles` and `crocTimestamp` entirely (Req 1).

Add `computeFileSize`:

```typescript
// Recursively sum file sizes. Returns undefined if any stat fails at top level.
export function computeFileSize(paths: string[]): number | undefined
```

> **Design note:** `computeFileSize` uses synchronous `statSync` for simplicity. This is acceptable because it runs after the transfer completes (not during UI rendering) and is called once per transfer. For directory sends with thousands of nested files, this may briefly block the event loop; an async version is a future improvement if it becomes a practical issue.

`spawnCrocReceive` no longer calls `renameReceivedFiles`. It returns the files as croc wrote them (using the directory snapshot diff, but without renaming).

### `utils/history.ts` changes

Add `formatFileSize`:

```typescript
// Formats bytes into human-readable string: "4.2 MB", "512 KB", "1.0 GB"
export function formatFileSize(bytes: number): string
```

### `hooks/useCrocCheck.ts` changes

Replace synchronous `getCrocPath()` call with an async `useEffect`:

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const path = await resolveCrocPathAsync(); // wraps getCrocPath in a Promise
    if (cancelled) return;
    setCrocPath(path);
    if (path) setVersion(await getCrocVersionAsync(path));
    setIsChecking(false);
  })();
  return () => { cancelled = true; };
}, []);
```

`resolveCrocPathAsync` uses `execFile("which", ["croc"], ...)` (the async, non-blocking variant) wrapped in a Promise, plus fallback checks for known Homebrew paths via `fs.access`. This is genuinely non-blocking — no `execSync` is used in the async path.

> **Design note:** The existing `getCrocPath()` uses `execSync` and is retained for the `QuickSendCommand` (no-view, no render thread concern) and for the module-level cache warm-up path. The async variant is used exclusively in `useCrocCheck` to avoid blocking the React render thread.

```typescript
function resolveCrocPathAsync(): Promise<string | null> {
  return new Promise((resolve) => {
    // 1. User-configured path (sync existsSync is fast — local FS only)
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.crocPath?.trim() && existsSync(prefs.crocPath.trim())) {
      return resolve(prefs.crocPath.trim());
    }
    // 2. which croc — truly async
    execFile("which", ["croc"], (err, stdout) => {
      const found = !err && stdout.trim();
      if (found) return resolve(stdout.trim());
      // 3. Known Homebrew paths
      const candidate = CANDIDATE_PATHS.find(p => existsSync(p)) ?? null;
      resolve(candidate);
    });
  });
}
```

### `hooks/useTransfer.ts` changes

Extend `TransferState` to include `"form"` and `"zipping"`:

```typescript
export type TransferState = "form" | "zipping" | "starting" | "waiting" | "transferring" | "done" | "error";
```

Add `phraseRef` (internal ref) so the cancel handler can read the current phrase without stale closure issues, enabling cancelled-record writing:

```typescript
// Called by SendCommand cancel action
cancel: (files: string[]) => void  // writes cancelled record if phrase exists
```

### `components/InstallGuide.tsx` changes

New props interface:

```typescript
interface InstallGuideProps {
  onCrocFound?: () => void; // called when cache is cleared and croc is now found
}
```

Two new actions:
1. **"Refresh"** — calls `clearCrocPathCache()`, re-checks, calls `onCrocFound()` or shows failure toast.
2. **"Install with Homebrew"** — runs `brew install croc` via async `execFile`, shows animated toast, on success calls `clearCrocPathCache()` and `onCrocFound()`.

### `src/quick-send.ts` (new file)

```typescript
// No-view command — no React, no hooks
export default async function QuickSend(): Promise<void>
```

Uses `getSelectedFinderItems()`, `spawnCrocSend`, `showHUD`, `addRecord`.

**Write-ahead history pattern** — `process.on('exit')` callbacks cannot execute async operations (including `LocalStorage.setItem`), so a synchronous write is not possible there. Instead, QuickSendCommand uses a write-ahead approach:

1. When the CodePhrase is generated → write a `TransferRecord` with `status: "in_progress"` (a new transient status used only by QuickSendCommand).
2. When transfer completes → call `updateRecord(id, { status: "success" })`.
3. When transfer fails → call `updateRecord(id, { status: "failed" })`.
4. On next extension launch (any command open) → scan history for any `"in_progress"` records older than 5 minutes and mark them `"failed"`. This handles the SIGKILL case where no cleanup ran.

`process.on('SIGTERM')` is registered as an additional best-effort handler: it calls `updateRecord` synchronously via a fire-and-forget Promise, then calls `process.exit(1)`. This covers graceful termination but not SIGKILL.

> **Known limitation:** If Raycast sends SIGKILL, the in-progress record will remain until the next extension launch cleans it up.

### `src/receive-file.tsx` changes

- Replace `List` input state with `Form` + `Form.TextField` (autoFocus, pre-populated from clipboard).
- Remove `/Share` subdirectory from `downloadDir` construction.
- Add "Reveal in Finder" action on done screen using `showInFinder(path)` from `@raycast/api` (preferred over `open -R` as it is the idiomatic Raycast API and more stable across versions).
- Cancel during `receiving` state writes a cancelled `TransferRecord`.

### `src/send-file.tsx` changes

- Replace inline state variables with `useTransfer` hook.
- Add `showHUD` on completion and failure.
- Compute file size via `computeFileSize` before sending; store in record.
- Cancel during `waiting`/`transferring` writes a cancelled record (delegated to hook's `cancel`).

### `src/transfer-history.tsx` changes

- Group records into Today / Yesterday / Earlier sections using a pure `groupByDate` function.
- Add `accessories` to `List.Item`: `{ date: new Date(record.timestamp) }` always; `{ tag: { value: "${n} files" } }` when `files.length > 1`.
- Pass `keywords={record.files.map(f => basename(f))}` to each `List.Item`.
- Display `formatFileSize(record.size)` in `RecordDetail` metadata when `size` is defined.

### `package.json` changes

- Add `quick-send` command entry with `"mode": "no-view"`.
- Update `downloadDirectory` preference description to remove mention of `/Share`.

---

## Data Models

Minimal schema change: `TransferStatus` gains `"in_progress"` for the QuickSendCommand write-ahead pattern. The `size` field already exists as `size?: number`. No structural changes otherwise.

```typescript
// TransferStatus gains "in_progress" — all other fields unchanged
export interface TransferRecord {
  id: string;
  type: TransferType;        // "send" | "receive"
  files: string[];           // original paths (no timestamp rename)
  phrase: string;
  timestamp: number;
  status: TransferStatus;    // "success" | "failed" | "cancelled" | "in_progress"
  size?: number;             // bytes — now populated for all completed transfers
  sessionId?: string;        // set only by QuickSendCommand; used for stale cleanup
}
```

> `"in_progress"` is a transient status used exclusively by `QuickSendCommand`. View-mode commands never write it.

### Session-Based Stale Record Cleanup

A time-based threshold (e.g. 5 minutes) is unsafe — a large-file transfer can legitimately run for hours, and opening the History command mid-transfer would incorrectly mark the record as `"failed"`.

Instead, QuickSendCommand uses a **sessionId** approach:

1. When the extension process loads, a module-level `SESSION_ID` is generated once: `const SESSION_ID = Math.random().toString(36).slice(2)`.
2. When QuickSendCommand writes the initial `"in_progress"` record, it stores `sessionId: SESSION_ID`.
3. On any command open, the extension scans history for records where `status === "in_progress"` **and** `sessionId !== SESSION_ID`. These belong to a previous process that is no longer running, so they are marked `"failed"`.
4. Records with `status === "in_progress"` and `sessionId === SESSION_ID` are left untouched — the transfer is still running in the current process.

This correctly handles all termination scenarios regardless of transfer duration.

### Date Grouping Logic

```typescript
type DateGroup = "Today" | "Yesterday" | "Earlier";

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  return "Earlier";
}
```

### File Size Computation

```typescript
function computeFileSize(paths: string[]): number | undefined {
  let total = 0;
  for (const p of paths) {
    try {
      const stat = statSync(p);
      if (stat.isDirectory()) {
        const sub = sumDirSize(p); // recursive, returns undefined on error
        if (sub === undefined) return undefined;
        total += sub;
      } else {
        total += stat.size;
      }
    } catch {
      return undefined;
    }
  }
  return total;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Receive preserves original filenames

*For any* set of filenames written to the download directory by croc, the file paths returned by `spawnCrocReceive` on completion should use those exact original filenames without any renaming, extension conversion, or timestamp prefix.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: History stores the filenames returned by receive

*For any* completed receive transfer, the `TransferRecord.files` array written to history should contain exactly the file paths that `spawnCrocReceive` reported in its `onComplete` callback — no transformation applied.

**Validates: Requirements 1.4**

---

### Property 3: extractCrocCode correctly extracts valid codes from arbitrary text

*For any* valid croc code phrase (a string matching the pattern `\d+-[a-z]+-...-[a-z]+`), `extractCrocCode` should return that phrase regardless of surrounding text, prefixes like "Code is:", or URL embedding.

**Validates: Requirements 3.4**

---

### Property 4: HUD completion message contains file identity information

*For any* set of one or more sent files, the HUD notification shown on successful send completion should contain either the basename of the file (when exactly one file) or the file count (when multiple files).

**Validates: Requirements 4.3**

---

### Property 5: Date grouping places every record in the correct section

*For any* `TransferRecord` with a given timestamp, `getDateGroup(record.timestamp)` should return "Today" if the timestamp falls on the current calendar day, "Yesterday" if it falls on the previous calendar day, and "Earlier" for all older timestamps — using local timezone boundaries.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

### Property 6: History list item accessories reflect record content

*For any* `TransferRecord`, the accessories array for its `List.Item` should always include a `date` entry set to `new Date(record.timestamp)`, and should additionally include a file-count tag when `record.files.length > 1`.

**Validates: Requirements 7.1, 7.2**

---

### Property 7: Cancelling a transfer with a known phrase writes a cancelled record

*For any* send or receive transfer that has progressed to a state where a code phrase is known (send: `waiting` or `transferring`; receive: `receiving`), invoking the cancel action should result in a `TransferRecord` with `status: "cancelled"` being written to history containing that phrase.

**Validates: Requirements 8.1, 8.2**

---

### Property 8: File size equals the sum of individual file sizes

*For any* non-empty list of file paths where all files exist, `computeFileSize(paths)` should return a value equal to the sum of `statSync(p).size` for each individual file path (with directories recursively summed).

**Validates: Requirements 9.1, 9.2, 9.3**

---

### Property 9: File size formatting produces a human-readable string

*For any* non-negative integer number of bytes, `formatFileSize(bytes)` should return a string containing a numeric value and a recognized unit suffix (one of: B, KB, MB, GB, TB).

**Validates: Requirements 9.5**

---

### Property 10: History search keywords include all file basenames

*For any* `TransferRecord` with a non-empty `files` array, the `keywords` prop passed to its `List.Item` should include the `basename` of every path in `record.files`.

**Validates: Requirements 16.1**

---

## Error Handling

**PTY wrapper failure** — If `/usr/bin/python3` is not found or spawn fails, `spawnWithPty` calls `onExit(1, errorMessage)`. Both `spawnCrocSend` and `spawnCrocReceive` route this to their `onError` callback, which shows a `Toast.Style.Failure` and writes a failed `TransferRecord`.

**croc non-zero exit** — Handled by the existing `onExit` logic in `spawnCrocSend`/`spawnCrocReceive`. The last 400 chars of output are included in the error message for diagnostics.

**`fs.statSync` failure in `computeFileSize`** — Returns `undefined`. Callers store `undefined` in `TransferRecord.size` and the UI omits the size field (Req 9.4).

**`getCrocPath` returns null** — All commands check this before spawning. `QuickSendCommand` shows a HUD. View commands show `InstallGuide`.

**Homebrew install failure** — The async `execFile` error callback shows a `Toast.Style.Failure` with the stderr output.

**QuickSendCommand unexpected termination** — Uses the write-ahead history pattern. A `process.on('SIGTERM')` handler fires `updateRecord` as a best-effort async call before exiting. If Raycast sends SIGKILL, the in-progress record is cleaned up on the next extension launch. `process.on('exit')` is NOT used for async writes as it does not support async operations.

**Cancelled before phrase** — No history record is written (Req 8.3, 8.4). The cancel handler checks whether a phrase has been generated before calling `addRecord`.

---

## Testing Strategy

### Unit Tests

Focus on pure utility functions that have no Raycast or process dependencies:

- `getDateGroup(timestamp)` — verify Today/Yesterday/Earlier boundaries including midnight edge cases
- `computeFileSize(paths)` — verify sum, directory recursion, undefined on stat failure
- `formatFileSize(bytes)` — verify unit selection and formatting across B/KB/MB/GB ranges
- `extractCrocCode(text)` — verify extraction from plain codes, prefixed strings, URLs, and rejection of non-codes
- `buildCrocArgs("receive")` — verify no extra args are passed; only `--yes` and optional relay
- `clearCrocPathCache()` — verify subsequent `getCrocPath()` call re-runs detection

### Property-Based Tests

Property tests use a **hand-rolled generator loop** (100 iterations minimum) for pure functions. This avoids any dependency on fast-check, which is not guaranteed to be available as a transitive dependency and cannot be added to `devDependencies` under NFR 3.

> **Note on fast-check:** fast-check may be available transitively via `@raycast/utils`, but relying on transitive dependencies is a known anti-pattern — they can disappear on version bumps. The hand-rolled approach is the canonical choice here.

**Property 1 & 2 — Receive preserves filenames and history stores them correctly**
Tag: `Feature: croc-transfer-improvements, Property 1+2: receive preserves original filenames`
Generate: random filename strings (alphanumeric, with various extensions including `.txt`). Write files to a temp dir. Run the snapshot-diff logic from `spawnCrocReceive` (extracted as a pure function). Assert: (1) returned paths use original names with no timestamp prefix or extension conversion; (2) the paths returned are exactly what would be stored in `TransferRecord.files` — no further transformation. Properties 1 and 2 are tested together because Property 2 is a direct consequence of Property 1: if the snapshot-diff returns original names, and the caller stores them verbatim, both properties hold.

**Property 3 — extractCrocCode**
Tag: `Feature: croc-transfer-improvements, Property 3: extractCrocCode extracts valid codes`
Generate: valid croc codes (digit segment + 2–4 lowercase word segments), optionally wrapped in "Code is: ", URLs, or surrounding whitespace. Assert extraction returns the code.

**Property 4 — HUD message content**
Tag: `Feature: croc-transfer-improvements, Property 4: HUD message contains file identity`
Generate: arrays of 1–10 file paths. Call the HUD message builder function. Assert single-file case contains basename; multi-file case contains count.

**Property 5 — Date grouping**
Tag: `Feature: croc-transfer-improvements, Property 5: date grouping correctness`
Generate: timestamps relative to now (today, yesterday, 2–365 days ago). Assert `getDateGroup` returns the correct label.

**Property 6 — Accessories**
Tag: `Feature: croc-transfer-improvements, Property 6: history list item accessories`
Generate: `TransferRecord` objects with varying `files` arrays. Call the accessory builder. Assert date entry always present; count tag present iff `files.length > 1`.

**Property 7 — Cancelled record**
Tag: `Feature: croc-transfer-improvements, Property 7: cancel writes cancelled record`
Generate: random phrases and file arrays. Simulate cancel in waiting/transferring/receiving state. Assert `addRecord` is called with `status: "cancelled"` and the correct phrase.

**Property 8 — File size sum**
Tag: `Feature: croc-transfer-improvements, Property 8: file size equals sum of individual sizes`
Generate: arrays of 1–10 file sizes. Write temp files of those sizes. Assert `computeFileSize` returns the exact sum.

**Property 9 — Size formatting**
Tag: `Feature: croc-transfer-improvements, Property 9: size formatting produces value + unit`
Generate: integers 0 to 10^12. Assert `formatFileSize` output matches `/[\d.]+ (B|KB|MB|GB|TB)/`.

**Property 10 — Search keywords**
Tag: `Feature: croc-transfer-improvements, Property 10: keywords include all basenames`
Generate: `TransferRecord` objects with 0–10 file paths. Call the keyword extractor. Assert every `basename(f)` appears in the keywords array.

### Integration Tests

Manual smoke tests (not automated) for behaviors that require the croc binary or Raycast runtime:

- End-to-end send + receive on localhost verifying no timestamp rename
- QuickSendCommand with Finder selection
- InstallGuide Refresh action after installing croc
- Deep link receive bypasses form

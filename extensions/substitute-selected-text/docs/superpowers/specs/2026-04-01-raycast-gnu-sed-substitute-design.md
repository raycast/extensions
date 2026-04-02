# Raycast GNU sed Substitute Plugin Design

- Date: 2026-04-01
- Status: Approved
- Owner: @tenfyzhong

## 1. Goal

Build a Raycast extension command that lets users select text in any app, trigger the command, enter a GNU sed substitution rule, preview the result, and write the replaced text back to the original app.

Core goals:

1. Keep compatibility with GNU sed `s` substitution behavior as much as possible.
2. Provide real-time preview using actual `gsed` output.
3. Support recent rules and favorite rules.
4. Support manual ordering for favorites.
5. Support deduplicated history with configurable max size.

## 2. Scope and Non-Goals

### In Scope

1. One command: `Substitute Selected Text` with a `Form` UI.
2. Rule input format: `/pattern/replacement/flags` (no need to type leading `s`) and custom delimiters such as `#foo#bar#g`.
3. Single substitution expression only (single `s` expression).
4. Multi-line input follows GNU sed line-by-line semantics by default.
5. Show recents and favorites in the same Form.
6. Favorites support manual reorder via move up/down.
7. Recents support delete single item and clear all.
8. History limit is configured via Raycast global preferences, default `10`.
9. If `gsed` is missing, block execution and show installation guidance.
10. If selected text cannot be read, fail and exit immediately.

### Non-Goals

1. No multi-`-e` chains and no full sed scripts.
2. No special failed-rule marker or failed-rule filtering.
3. No manual input fallback when no text is selected.
4. No drag-and-drop favorite ordering.

## 3. UX Flow

### 3.1 Entry

1. User selects text in a target application.
2. User triggers the Raycast command.
3. Command startup immediately reads selected text:
   - Success: open Form.
   - Failure: show toast and exit.

### 3.2 Form Structure

1. Editable `Rule` input.
2. Read-only `Original` text.
3. Read-only `Preview` text or error message.
4. Favorites section (custom order).
5. Recents section (most recent first).
6. Primary action: `Apply Replacement`.
7. Submission is allowed for any non-empty rule; parse/execute failures are reported after submit and still recorded in history.

### 3.3 Rule Usage

1. Typing a rule manually:
   - Input changes trigger debounced preview execution.
2. Selecting from Favorites/Recents:
   - Fill the input.
   - Refresh preview automatically.
   - Only apply after explicit `Apply Replacement` confirmation.

### 3.4 List Management

1. Favorite actions: use, move up, move down, unfavorite.
2. Recent item actions: use, delete item.
3. Recent global action: clear history.

## 4. Technical Design

### 4.1 Architecture

Single command + local persistence + `gsed` subprocess:

1. `command` layer: Raycast Form and actions.
2. `rule` layer: parse and validate rule input, build sed expression.
3. `preview` layer: debounced `gsed` preview execution.
4. `apply` layer: apply replacement and write back to source app (clipboard + paste).
5. `storage` layer: history/favorites persistence, dedupe, reorder, trimming.
6. `preferences` layer: read `historyLimit` preference.

### 4.2 GNU sed Execution Strategy

Chosen approach: execute local `gsed` directly.

1. Preview and apply share the same execution path to keep behavior consistent.
2. Preview calls are debounced (target 200 ms).
3. Execution model:
   - Pass selected text through stdin.
   - Run `gsed -e "<s-expression>"` and capture output.
4. If `gsed` is not found, show:
   - `brew install gnu-sed`
   - a note that this command requires `gsed` on PATH.

### 4.3 Rule Parsing

Input examples: `/foo/bar/g` or `#foo#bar#g`

Output examples: `s/foo/bar/g` or `s#foo#bar#g`

Rules:

1. First character is the delimiter.
2. Parse into `pattern`, `replacement`, and `flags`.
3. Support escaped delimiter inside `pattern` and `replacement`.
4. Parse failures are surfaced in Preview.

### 4.4 Data Model

```ts
type HistoryItem = {
  id: string;
  rawInput: string;
  createdAt: number;
};

type FavoriteItem = {
  id: string;
  rawInput: string;
  order: number;
  createdAt: number;
};
```

Persistence behavior:

1. History dedupe:
   - On insert, if same `rawInput` exists, remove old item and insert at head.
   - Record on every explicit apply attempt, including failures.
2. History limit:
   - Read `historyLimit` (default 10), trim oldest overflow items.
3. Favorites are independent:
   - Stored separately from recents.
   - Same rule can exist in both lists.
4. Favorite ordering:
   - Reorder by `order` through move up/down.

### 4.5 Apply Back to Source App

After successful sed execution:

1. Write transformed text to clipboard.
2. Paste over current selection in the previously focused app.

Edge behavior:

1. If focus changes and paste does not hit the target app, show retry guidance.
2. Keep generic clipboard/paste flow, no app-specific editor integrations.

## 5. Error Handling

1. No selected text: fail and exit.
2. `gsed` missing: fail with install guidance.
3. Parse failure: show parse error; submit can still be attempted and should be recorded.
4. `gsed` execution failure: show stderr; do not paste; still record in history.
5. Paste-back failure: show error and allow retry.

## 6. Testing Strategy

Use reusable unit tests (no one-off scripts):

1. `rule parser`
   - valid expressions, escaped delimiters, invalid expressions
2. `history manager`
   - dedupe-to-front, max-size trim, delete item, clear all
3. `favorites manager`
   - add favorite, remove favorite, move up/down bounds
4. `gsed runner`
   - successful run, missing binary, execution error
5. `integration-lite` with mocks
   - selecting favorite/recent fills rule and refreshes preview
   - preview failure can still be submitted; failed submit is stored in history

## 7. Preferences

Raycast extension preferences:

1. `historyLimit` (number-like text)
2. Default: `10`
3. Applied whenever history is written.

## 8. Implementation Milestones

1. Command scaffold + Form structure.
2. Rule parser + `gsed` preview pipeline.
3. Apply-back flow (clipboard + paste).
4. History/favorites persistence and management actions.
5. Tests and README updates.

## 9. Acceptance Criteria

1. `/foo/bar/g` provides real-time preview and successful replacement.
2. Custom delimiter rules (for example `#foo#bar#g`) work.
3. History has no duplicates; reused rule moves to front.
4. History never exceeds `historyLimit`.
5. Favorites support persisted move up/down ordering.
6. Selecting from favorites/recents shows preview and requires explicit confirmation.
7. Missing selection or missing `gsed` follows expected fail-fast behavior.
8. Failed apply attempts (parse or execution errors) are still recorded in history.

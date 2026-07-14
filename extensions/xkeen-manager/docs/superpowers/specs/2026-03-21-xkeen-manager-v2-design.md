# XKeen Manager v2 — Design Spec

## Overview

Refactor and optimize the XKeen Manager Raycast extension. The current implementation is a 2060-line monolith with sequential SSH calls, flat UI, and a Quick Add feature that no longer works with the user's categorized routing config. This spec addresses performance, architecture, UX, and feature gaps.

## Goals

1. Reduce first-launch time from ~3-6s to ~1-2s
2. Break monolith into focused modules (target ~200-400 lines each)
3. Redesign main screen for clarity — frequently used items prominent, rarely used items accessible but hidden
4. Rebuild Quick Add to work with comment-delimited routing categories
5. Preserve comments in routing JSON through edit/save cycles
6. Alert user when xkeen is down

## Non-Goals

- Menubar command (deferred to Hypothesis C)
- Background monitoring / polling (deferred to Hypothesis C)
- LocalStorage caching (deferred to Hypothesis C)
- Speedtest / latency testing
- Changes to setup-ssh.tsx or setup.sh

---

## 1. File Architecture

Split `src/xkeen-manager.tsx` (2060 lines) into:

```
src/
├── xkeen-manager.tsx              # Main List component (~150 lines)
├── lib/
│   ├── ssh.ts                     # runRemote, runRemoteRaw, queue, retry, formatSshError
│   ├── json.ts                    # stripJsonComments, tryParseJson, validateXrayJson
│   ├── routing.ts                 # parseRoutingCategories, applyRoutingMutation, text-based insertion
│   ├── profiles.ts                # CRUD, readMeta/writeMeta, switchTo
│   ├── health.ts                  # loadHealthSnapshot, verifyTrafficPath, fetchIp
│   └── utils.ts                   # shQuote, stripAnsi, cleanOutput, extractIpv4, formatters
├── components/
│   ├── StatusItem.tsx             # Status line (profile + mode)
│   ├── QuickAddForm.tsx           # Quick Add with category dropdown
│   ├── JsonEditor.tsx             # JSON editor (routing/outbounds), straight port with comment fix
│   ├── ProfilesList.tsx           # Profile management, straight port
│   ├── LogsDetail.tsx             # Log viewer, straight port
│   ├── HealthDetail.tsx           # Health check screen, straight port
│   ├── IpDetail.tsx               # IP check screen, straight port
│   └── BackupsHub.tsx             # Backups and rollback, straight port
└── setup-ssh.tsx                  # Unchanged
```

Delete unused `src/ssh.ts` (duplicates functionality in main file).

**Notes:**
- Port existing `stripJsonComments` implementation as-is to `lib/json.ts` — it already handles `//`, `/* */`, and string literals correctly.
- Components marked "straight port" are moved without logic changes (only import paths updated).
- Target ~200-400 lines per module. `routing.ts` may be larger due to text manipulation complexity.

## 2. Performance Optimization

### 2.1. Combined SSH call at startup

Current: 3 sequential SSH calls + 1 HTTP request + 500ms artificial sleeps.

New: single `runRemote` call that returns both xkeen status and health data. This replaces both `loadStatus()` and `loadHealthSnapshot()`.

Shell script:

```sh
PROFILES_DIR=${qProfilesDir};
STATUS_RAW=$(xkeen -status 2>&1 || true);
OPT_MOUNTED=$(mount | grep -q " on /opt " && echo yes || echo no);
OPT_WRITABLE=$([ -w /opt ] && echo yes || echo no);
OPT_FREE_MB=$(df -Pm /opt 2>/dev/null | awk 'NR==2{print $4}');
XKEEN_AVAILABLE=$(command -v xkeen >/dev/null 2>&1 && echo yes || echo no);
UPTIME=$(uptime 2>/dev/null | tr -s " " || echo "unknown");
ACTIVE_PROFILE=$([ -f "$PROFILES_DIR/.active" ] && cat "$PROFILES_DIR/.active" || echo unknown);
echo "___STATUS_START___";
echo "$STATUS_RAW";
echo "___STATUS_END___";
echo "OPT_MOUNTED=$OPT_MOUNTED";
echo "OPT_WRITABLE=$OPT_WRITABLE";
echo "OPT_FREE_MB=$OPT_FREE_MB";
echo "XKEEN_AVAILABLE=$XKEEN_AVAILABLE";
echo "UPTIME=$UPTIME";
echo "ACTIVE_PROFILE=$ACTIVE_PROFILE";
```

Parsed into TypeScript type:

```ts
type StartupData = {
  statusRaw: string;       // full text from xkeen -status (parsed with existing regexes for running/stopped/mode)
  optMounted: boolean;
  optWritable: boolean;
  optFreeMb: string;
  xkeenAvailable: boolean;
  uptime: string;
  activeProfile: string;
}
```

Parsing: split output by `___STATUS_START___` / `___STATUS_END___` delimiters for statusRaw, then `parseKeyValueLines()` for the rest.

### 2.2. Lazy IP loading

IP check removed from startup entirely. Displayed as "Нажмите для проверки" until user clicks. Saves one SSH + one HTTP request.

### 2.3. Remove artificial sleeps

The `sleep(300)` and `sleep(200)` between calls are no longer needed with a single combined request.

### 2.4. Expected result

| Metric | Before | After |
|---|---|---|
| SSH calls at startup | 3 | 1 |
| HTTP calls at startup | 1 | 0 |
| Artificial delays | 500ms | 0ms |
| Estimated first-load time | 3-6s | 1-2s |

## 3. Main Screen Redesign

### 3.1. Layout — complete item list

Three sections in the main List:

**Section "Xkeen" (2 items):**
- **Status** — icon green/red, subtitle: `Запущен (Mixed) · NL-server` or `Остановлен`
- **Restart** — subtitle shows "Есть несохранённые изменения" when applicable

**Section "Routing" (2 items):**
- **Quick Add** — opens QuickAddForm (the most common action)
- **Routing Editor** — opens JsonEditor for 05_routing.json

**Section "Manage" (2 items):**
- **Profiles** — subtitle shows active profile name
- **Health** — subtitle shows compact health info

**Total: 6 items visible** (down from 8).

### 3.2. Moved to Action Panel (Cmd+K on Status)

These items are NO LONGER separate list items. They are accessible only via Cmd+K on the Status row:
- **IP Check** — Action.Push to IpDetail
- **Outbounds Editor** — Action.Push to JsonEditor for 04_outbounds.json
- **Backups & Rollback** — Action.Push to BackupsHub
- **Show Logs** — Action.Push to LogsDetail
- **Start / Stop Client** — Action with icon
- **Refresh Status** — Action

### 3.3. Removed from main list

The following current list items are removed as separate rows:
- **IP** row → moved to Status action panel
- **Outbounds** row → moved to Status action panel
- **Backups & Rollback** row → moved to Status action panel

## 4. Quick Add with Categories

### 4.1. Category parsing

New function `parseRoutingCategories(rawText: string)` parses comment headers from the routing JSON.

**Comment format regex:**

```ts
const CATEGORY_HEADER = /\/\/\s*=+\s*\n\s*\/\/\s*(\d+)\.\s*(.+?)\s*\n\s*\/\/\s*=+/g;
```

Matches blocks like:
```
// ============================================================
// 3. VPN по доменам — AI и нейросети
// ============================================================
```

**Extraction algorithm:**

1. Find all comment headers via regex, record their character positions
2. For each header, scan forward in the raw text to find the next JSON object (`{...}`)
3. Within that object, extract `outboundTag` via regex: `/"outboundTag"\s*:\s*"([^"]+)"/`
4. Detect `field` by checking which array key exists in the rule object, in priority order: `"domain"` first, then `"ip"`, then `"ruleSet"`. If multiple exist, use the first match.
5. Record the rule's character position range (start of `{` to matching `}`) for later text-based insertion

Returns array of:

```ts
type RoutingCategory = {
  index: number;           // position in rules[] array
  number: number;          // category number from comment (3)
  title: string;           // "VPN по доменам — AI и нейросети"
  outboundTag: string;     // "vless-reality" or "direct"
  field: "domain" | "ip" | "ruleSet";
  charStart: number;       // start position of rule `{` in raw text
  charEnd: number;         // end position of rule `}` in raw text
}
```

**Fallback:** If no category headers are found (no comments matching the regex), return an empty array. The Quick Add form will show only the default "Ручные домены (Raycast)" option, which auto-creates a new category block.

### 4.2. UI

Form with:
- **Dropdown** (`Form.Dropdown`): list of parsed categories + "Ручные домены (Raycast)" as default selected option
- **TextArea**: input (one per line or comma-separated)
- **Submit**: "Apply"

The category's `outboundTag` determines whether entries go to proxy or direct — no separate mode selector needed. The old 6 modes (`proxy-domain`, `proxy-geosite`, etc.) are replaced by category selection. Normalization (adding `domain:` prefix, `ext:geosite_v2fly.dat:` prefix, etc.) is applied based on the category's `field` value and input content.

### 4.3. "Ручные домены" auto-creation

If the routing file has no category containing "Raycast" or "raycast" in its title, Quick Add creates one automatically.

Category number: `max(existing category numbers) + 1`.

```
// ============================================================
// N. VPN по доменам — добавлено через Raycast
// ============================================================
{
  "type": "field",
  "inboundTag": ["redirect", "tproxy", "mixed"],
  "outboundTag": "vless-reality",
  "domain": []
}
```

Inserted before the catch-all rules (DIRECT by IP and DIRECT fallback) — detected by finding the last two rules in the array.

### 4.4. Text-based insertion algorithm

To preserve comments, mutations work on raw text rather than parsed JSON:

1. **Locate target rule** using `charStart`/`charEnd` from parsed category
2. **Find the target array** within the rule's text range. Scan for `"domain"` (or `"ip"` / `"ruleSet"`) key, then find its `[` and matching `]` using a bracket counter that respects string literals
3. **Find insertion point**: position just before the closing `]`. If the array is non-empty, insert `,\n` + indented entries. If empty (`[]`), insert `\n` + indented entries + `\n` + indent
4. **Splice** the new text into the raw string at the calculated position
5. **Validate** the result: `stripJsonComments(result)` → `JSON.parse()`. If invalid, abort and show error. Do not write.

Edge cases:
- Single-line arrays like `"domain": ["a", "b"]` — detected by checking if `[` and `]` are on the same line. Expand to multi-line before inserting.
- Nested objects within rules — the bracket counter handles this by tracking depth.

## 5. Comment Preservation in Editor

### 5.1. Display

In `JsonEditor.load()`, display the raw text from `readRemoteFile()` directly in `Form.TextArea`. Do NOT call `prettyJsonOrOriginalForPath()` or any parse-and-stringify pipeline. Comments remain visible as-is.

### 5.2. Validation

On save:
1. `stripJsonComments(content)` → `JSON.parse()` to validate
2. `validateXrayJson()` on the parsed result
3. Write `content` (raw, with comments) to the remote file

### 5.3. Preview

"Preview (Read-Only)" action shows raw text in a markdown code block. Comments are visible as-is.

## 6. Code Cleanup

### 6.1. Delete

- `src/ssh.ts` — unused, duplicated by `runRemoteRaw` in main file
- `buildQuickDiff()` — 40-line custom diff, replace with simple "N lines changed" message

### 6.2. Remove (no longer needed with category-based Quick Add)

- `insertCommentBeforeRule()` — hardcoded to old `ruleTag` system
- `addRoutingRaycastBlockComments()` — same
- `ensureRaycastRoutingRule()` — created special raycast rules, replaced by category insertion
- `findRaycastRuleIndex()` — searched for raycast-tagged rules
- `sanitizeConfigForSave()` — cleaned `raycastManaged` flags, no longer applicable

### 6.3. Keep unchanged (straight port to new files)

- `safeWriteRemoteFile()` + backup/rollback logic
- ProfilesList + meta CRUD
- `setup-ssh.tsx` + `assets/setup.sh`
- SSH queue (`enqueueRemoteTask`) and retry logic
- `BackupsHub` — straight port to `components/BackupsHub.tsx`

### 6.4. Migration: legacy `ruleTag` / `raycastManaged` fields

Existing routing configs may contain `ruleTag: "raycast:..."` or `raycastManaged: true` fields from the current version. These are harmless to Xray (ignored as unknown fields). v2 will not clean them up automatically — they remain in the file until the user manually edits them out. No migration step needed.

## 7. Crash Alert

On startup, after loading status, if xkeen is not running:

```ts
await showToast({
  style: Toast.Style.Failure,
  title: "Xkeen не запущен!",
  message: `Последний профиль: ${activeProfile}`,
});
```

The status icon is already red when stopped. The toast adds an explicit notification so the user doesn't miss it.

## 8. Hypothesis C (Deferred)

Documented for future implementation:

- **Menubar command**: tray icon showing current status and profile, one-click profile switching
- **Background health monitoring**: periodic SSH poll (every 5-10 min), native macOS notifications via `showHUD` when xkeen goes down
- **LocalStorage caching**: persist last-known status/health/profile between Raycast launches for instant first render, update in background
- **Speedtest integration**: optional latency check through VPN tunnel

These features require a separate design cycle and are out of scope for v2.

---

## Dependencies

- `@raycast/api` ^1.104.1 (no changes)
- `@raycast/utils` ^1.17.0 (no changes)
- No new dependencies required

## Migration

No breaking changes to user preferences or remote file structure. Existing profiles, backups, and SSH config continue to work as-is.

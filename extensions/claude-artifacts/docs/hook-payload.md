# The `Artifact` PostToolUse payload

**Verified empirically 2026-07-25** on Claude Code, macOS, by registering
[`scripts/probe-artifact-hook.sh`](../scripts/probe-artifact-hook.sh) and
publishing a throwaway artifact. This shape is **undocumented** — Claude Code
documents the hook config contract but not this tool's response — so treat it as
an observation with a date, not a contract, and re-run the probe if the hook
starts missing artifacts.

## The question this answered

The extension's entire design rested on an unverified assumption: that
`PostToolUse` fires for the harness-provided `Artifact` tool at all. It does.

```text
hook_event_name: "PostToolUse"
tool_name:       "Artifact"
duration_ms:     484
```

## Captured payload

```jsonc
{
  "session_id": "df742463-…",
  "transcript_path": "/Users/…/.claude/projects/…/df742463-….jsonl",
  "cwd": "/Users/messina/Developer/GitHub/chrismessina/raycast-claude-artifacts",
  "prompt_id": "75155ffe-…",
  "permission_mode": "auto",
  "effort": { "level": "high" },
  "hook_event_name": "PostToolUse",
  "tool_name": "Artifact",
  "tool_input": {
    "file_path": "/private/tmp/…/probe-throwaway.md",
    "favicon": "🔬",
    "description": "Throwaway artifact to verify the PostToolUse hook fires for the Artifact tool.",
  },
  "tool_response": {
    "url": "https://claude.ai/code/artifact/d9d100f0-84be-4702-b48e-8b7866edb387",
    "path": "/private/tmp/…/probe-throwaway.md",
    "title": "probe-throwaway.md",
    "updated": false,
    "version": "1785010773-d063",
    "liveSubscription": "flag_off",
  },
  "tool_use_id": "toolu_01FQsoZxv5Ec5jFT26mWJANG",
  "duration_ms": 484,
}
```

## Four findings that changed the implementation

### 1. `tool_response.title` is the FILENAME, not the page title

It reported `probe-throwaway.md`, not the `<title>` tag or anything
human-authored. Filenames are weak retrieval cues and many collide outright
(`index.html`, `report.html`).

**So the hook's title precedence is:** `tool_input.title` →
`tool_input.description` → `tool_response.title` (filename) → the artifact id.
The human-written `description` is the best cue actually available, and it is the
one the extension shows.

### 2. `tool_response.updated` is a BOOLEAN, not a date

`false` on first publish, `true` when republishing an existing URL. The index's
own `updated` field is a `YYYY-MM-DD` date — **identical name, incompatible
type.** Wiring one to the other would put `true` where the reader expects a date
and silently break recency sorting, which is the extension's whole point.

The hook stamps the local date itself. There is a comment at that line saying
why, because the name collision is an easy trap to walk back into.

### 3. `tool_input.action` is ABSENT on a publish

The design assumed `action: "publish"` would be present and that
`action: "list"` needed filtering out. On a real publish there is no `action`
key at all. The hook's `// "publish"` jq default handles this — had it required
the field, it would have skipped every real artifact.

Whether `action: "list"` even reaches the hook is untested; the filter stays as
cheap insurance against recording other people's shared artifacts.

### 4. Two undocumented fields, deliberately not captured

- **`version`** (`"1785010773-d063"`) — an opaque republish token. Nothing in the
  UI would read it, so storing it would be speculative.
- **`liveSubscription`** (`"flag_off"`) — session feature-flag state, not a
  property of the artifact.

Also present and unused: `transcript_path`, `prompt_id`, `permission_mode`,
`effort`, `session_id`, `tool_use_id`. `cwd` **is** used — it is the only source
of project attribution, and it is free at write time but impossible to backfill.

## `$HOME` expands in the `command` field

Confirmed empirically 2026-07-25: a hook registered as
`"command": "$HOME/.claude/hooks/record-artifact.sh"` fired and recorded the
artifact.

Worth stating because it is **not** documented. Claude Code's hooks reference
lists only `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, and
`${CLAUDE_PLUGIN_DATA}` as placeholders Claude Code itself expands, and
recommends absolute paths over shell variables. `$HOME` works because the
command runs through a shell (no `args` key ⇒ shell form), not because the
platform promises it. An absolute path is the fallback if that ever changes.

## Related: `Action.ShowInFinder` throws on a missing path

Not a payload fact, but it is caused by one. The index stores the `cwd` an
artifact was published from, and **stale paths are the expected steady state** —
directories get renamed, archived, and deleted long before the artifact is
forgotten.

`Action.ShowInFinder` calls `realpath` internally and throws an **unhandled**
`ENOENT`, which Raycast renders as a full-screen error with a JavaScript stack
trace (observed 2026-07-25 on a moved project folder). A path that came from a
recorded `cwd` must therefore be checked with `fs.access` before revealing, and
the failure surfaced as a toast — see
[`src/actions/reveal-in-finder.tsx`](../src/actions/reveal-in-finder.tsx).

## The lock is kernel-backed, and that is not a detail

`scripts/record-artifact.sh` serialises writes with a **`flock(2)` advisory lock**
held by a `perl` process for the duration of the critical section. macOS ships no
`flock(1)`, but it ships perl. `perl` absent ⇒ the hook logs and skips rather than
writing unserialised, because a lost row beats a corrupt index.

The portable-looking alternative — `mkdir` as an atomic test-and-set plus an
age-based reaper for locks left by killed processes — **cannot be made correct**,
and it took two rounds of green tests to see why. If you are about to change the
locking here, or to port this hook to another platform, read that first:

→ **[`docs/solutions/design-patterns/lockfile-mtime-cannot-prove-liveness.md`](./solutions/design-patterns/lockfile-mtime-cannot-prove-liveness.md)**

The one-line version: a lockfile's mtime says how old a lock is, never whether its
owner is alive, so any reaper threshold can steal a live lock — and both rejected
designs passed their concurrency tests.

## Re-verifying

```bash
scripts/probe-artifact-hook.sh --report
```

Prints the top-level keys, the `tool_response` type, any artifact URLs found, and
the most recent payload pretty-printed. If `tool_response` ever arrives as a
string instead of an object, the hook already handles it — the URL is always
extracted by regex rather than taken from a field whole, because a string-shaped
response embeds the URL in prose (`"Published to <url> successfully"`) and taking
the field whole drags the trailing words into the id.

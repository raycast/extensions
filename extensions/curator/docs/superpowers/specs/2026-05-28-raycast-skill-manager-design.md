# Raycast Skill Manager — Design Spec

- **Date**: 2026-05-28
- **Status**: Approved (brainstorming complete, ready for writing-plans)
- **Project root**: `~/Projects/raycast-skill-manager`
- **Approach chosen**: B ("Workshop") — see Approaches Considered below

---

## 1. Problem & Motivation

The author runs 100+ skills across multiple agent runtimes (Claude Code, Codex,
Copilot, OpenCode), sourced from several marketplaces (superpowers,
legal-academic-writing-skills, firecrawl, officecli, opencli, claude-hud,
karpathy, openai-codex) plus personal repos. They are scattered across three
filesystem layers and named in mixed Chinese/English with inconsistent
conventions.

**Core pain (the one this v1 solves)**: "I have too many skills installed and
can't see what state they're in." Concretely two moments:

1. **Recall (primary, ~90%)**: mid-conversation in Claude/Codex, the author
   wants to invoke a skill but has forgotten its name. They need a fast,
   searchable inventory.
2. **Health (secondary)**: periodically wanting to know which skills are broken,
   misconfigured, or drifting between agent surfaces.

There is an existing private bash tool (`agent-skills`) that does some of this,
but this extension **deliberately does not depend on it** — see Decision D4.

## 2. Locked Decisions

These came out of a structured grill session and are fixed for v1.

| # | Decision point | Answer |
|---|---|---|
| D1 | Trigger pain | "Too many installed, don't know their state" (inventory + health) |
| D2 | View backbone | Inventory + Health dual view |
| D3 | LLM recommendation | **Deferred to v2**; v1 stores `description`/`keywords` to enable it |
| D4 | Backend relationship | **Fully standalone** — zero dependency on `agent-skills` or any private bash script / repo layout |
| D5 | Agent coverage | **Claude + Codex** (both surfaces, including plugin dirs) |
| D6 | Write-action level | **M2'** — viewer + copy fix commands to clipboard; **never** writes the filesystem |
| D7 | Primary use case | **U1** — launcher (Inventory first, Health as badge + secondary command) |
| D8 | Audience | Publishable to Raycast Store; must run standalone on any machine |

## 3. Scope

**In (v1)**

- Scan and inventory skills from Claude + Codex (user + plugin dirs).
- Fuzzy search by name, description, trigger phrases, marketplace.
- Render SKILL.md in a detail panel.
- Copy skill name / `/command` / trigger phrase; open in editor; reveal in Finder.
- Health checks (4 classes + 1 info) with copy-to-clipboard fix commands.
- mtime-incremental cache for snappy repeat opens.
- Preserve full frontmatter in cache as a v2 LLM hook.

**Out (v1)**

- LLM-based recommendation / natural-language intent matching (→ v2).
- Overlap/semantic-clustering analysis.
- Usage tracking (no data source exists; Claude does not expose invocation logs).
- Copilot / OpenCode surfaces (→ possible v1.x/v2).
- Any filesystem write, install/uninstall, enable/disable, menubar command,
  file watcher, or local embedding store.

## 4. Architecture

**Stack**: TypeScript + Raycast API (`@raycast/api` v1.x), React + Raycast
`<List>` / `<Detail>`. Node built-ins `fs/promises`, `path`. `js-yaml` for
frontmatter. `vitest` for tests. Package manager: `pnpm`. No heavy deps
(`chokidar`, transformers, state libs).

**Raycast commands** (`package.json` → `commands`):

| Command ID | Title | Mode | Entry |
|---|---|---|---|
| `search-skills` | Search Skills | `view` | `src/search-skills.tsx` |
| `skill-doctor` | Skill Doctor | `view` | `src/skill-doctor.tsx` |

No menubar, no no-view commands.

**Directory layout** (~10-15 files):

```
src/
├── search-skills.tsx          # Command 1 (List + Detail)
├── skill-doctor.tsx           # Command 2 (List of issues)
├── lib/
│   ├── scanner.ts             # scan 3 Claude layers + Codex → RawSkillEntry[]
│   ├── parser.ts              # SKILL.md → ParsedSkill
│   ├── health.ts              # ParsedSkill[] → HealthIssue[]
│   ├── fix-commands.ts        # HealthIssue → shell command string
│   ├── cache.ts               # Raycast Cache + mtime invalidation
│   └── types.ts               # shared types
└── components/
    ├── SkillListItem.tsx
    ├── SkillDetail.tsx
    └── IssueListItem.tsx
assets/
└── icon.png                   # extension icon (pre-publish asset)
```

**Key architectural decisions**

- `lib/` is pure functions + a cache facade, zero React dependency → unit testable.
- Both commands share the Raycast `Cache` (extension-wide); each owns its own
  `<List>` state.
- No Redux/Zustand — Raycast `<List>` provides selection + filtering.

## 5. Scanning & Data Model

**Scan paths (by priority)**

```
~/.claude/skills/*                                        → claude-user
~/.claude/plugins/marketplaces/<mp>/skills/*              → claude-plugin-marketplace
~/.claude/plugins/marketplaces/<mp>/plugins/<p>/skills/*  → claude-plugin-nested
~/.claude/plugins/cache/<mp>/<version>/skills/*           → claude-plugin-cache
~/.codex/skills/*                                         → codex-user
~/.codex/plugins/... (dynamic; same structure → same handling)
```

Only directories containing a `SKILL.md` are treated as skills. Do not recurse
into directories without one. Follow symlinks once; cycle-detect with a visited
set.

**SKILL.md parsing**: `js-yaml` for frontmatter. Core fields of interest:
`name`, `description`, optional `allowed-tools`. **All other frontmatter keys are
preserved** in `frontmatter` — this is the v2 LLM food; never discard it.

**Core types** (`lib/types.ts`):

```ts
type SourceType =
  | "claude-user" | "claude-plugin-marketplace"
  | "claude-plugin-nested" | "claude-plugin-cache"
  | "codex-user" | "codex-plugin-marketplace"
  | "codex-plugin-nested" | "codex-plugin-cache";

type Surface = "claude" | "codex";

type ParsedSkill = {
  id: string;                  // sha1(realPath) — stable across scan sessions
  name: string;                // frontmatter.name ?? basename(dir)
  description: string;         // frontmatter.description ?? ""
  surface: Surface;
  source: SourceType;
  marketplace?: string;        // plugin sources only
  pluginName?: string;         // nested only
  pluginVersion?: string;      // cache only
  entryPath: string;           // path as scanned
  realPath: string;            // symlink-resolved
  isSymlink: boolean;
  frontmatter: Record<string, unknown>;  // full, preserved
  body: string;                // SKILL.md body sans frontmatter
  fileMtime: number;           // realPath mtime (ms)
  triggerHints: string[];      // phrases extracted from description
  keywords: string[];          // tokenized description for Raycast keywords
};

type HealthSeverity = "error" | "warning" | "info";

type HealthIssue = {
  id: string;                  // stable per (check, skill)
  check: "H1" | "H2" | "H3" | "H4" | "H5";
  severity: HealthSeverity;
  skillName: string;
  message: string;             // human-readable
  affectedPaths: string[];
  fixCommand: string;          // copy-only, never executed
};
```

**Same-name aggregation rules**

| Situation | Handling |
|---|---|
| Same `realPath`, different `surface` (Claude & Codex point to one source) | Merge into **one row**; right-side badges `[claude] [codex]` |
| Same `name`, different `realPath` | **Separate rows** (genuinely different code) |
| Same `(marketplace, pluginName, name)`, different `pluginVersion` (multi-version cache) | Show **latest only**; older versions become Doctor's H5 "stale cache" info, not shown in Inventory |

**triggerHints extraction**: 3 regexes against `description` —
- `Use when user says "X", "Y"` → capture quoted phrases
- `Trigger words: A, B, C` → capture comma list after colon
- `Use when ...` → capture clause up to period as a full hint

If none match, fall back to `keywords`. No NLP, no LLM.

**v2 hook**: the full `ParsedSkill` JSON (with `body` truncated to 2KB) is
persisted in the cache, so v2 LLM recommendation can embed / prompt against this
structured cache without re-scanning the filesystem.

## 6. Inventory Command UX (`search-skills`)

Primary command for the U1 launcher case.

**Default (browse/search) state**

```
┌─ Search Skills ───────────────────────────────────────────────────┐
│ 🔍 抓网页                                                          │
├───────────────────────────────────────────────────────────────────┤
│ User · Claude + Codex                                             │
│  ▢ firecrawl-scrape   Extract clean markdown from any URL  [c][x] │
│  ▢ firecrawl          Search, scrape, interact via CLI     [c][x] │
│ Plugins · superpowers                                            │
│  🔌 brainstorming     Turn ideas into designs              [c]    │
│  🔌 systematic-debug… Use when encountering any bug        [c] ⚠️ │
│ Plugins · legal-academic-writing-skills                          │
│  🔌 tighten           收紧学术散文，砍掉不做实事的句子      [c]    │
└───────────────────────────────────────────────────────────────────┘
```

- **Grouping**: `List.Section` by source, order `User → Plugins (by marketplace)`;
  within a section, alphabetical by name.
- **Row**: icon + name (title) + first sentence of description (subtitle).
- **Accessories**: surface badges `[c]`=claude `[x]`=codex; health badge `⚠️`
  (warning) or `🔴` (broken) when applicable.
- **Search**: Raycast built-in filter matches `name + keywords`, where
  `keywords = description tokens + triggerHints + marketplace`. Typing `抓网页`,
  `scrape`, `markdown`, or `superpowers` all hit.

**Detail toggled (⌘D) — view SKILL.md**

```
┌─ Search Skills ────────────────────┬──────────────────────────────┐
│ 🔍 firecrawl                        │ # firecrawl-scrape           │
├──────────────────────────────────────┤                              │
│ User · Claude + Codex               │ Extract clean markdown from  │
│ ▶▢ firecrawl-scrape  [c][x]        │ any URL, including JS SPAs.  │
│  ▢ firecrawl         [c][x]        │ **Source**  local-skills/shared │
│                                     │ **Path**    ~/Projects/local-…  │
│                                     │ **Surfaces** claude, codex     │
│                                     │ **Triggers** "scrape", "grab"  │
│                                     │ ───────────────────────────  │
│                                     │ [SKILL.md body rendered]     │
└──────────────────────────────────────┴──────────────────────────────┘
```

Detail upper half = `<Detail.Metadata>`; lower half renders `body`.

**ActionPanel (per row)**

| Shortcut | Action | Behavior |
|---|---|---|
| `⏎` (primary) | Copy Skill Name | copies `name` |
| `⌘⏎` | Copy as `/command` | copies `/<plugin>:<name>` or `/<name>` |
| `⌘⇧T` | Copy Trigger Phrase | copies best triggerHint |
| `⌘D` | Toggle Detail | show/hide SKILL.md |
| `⌘O` | Open in Editor | `code`/`cursor` on SKILL.md (detect available editor) |
| `⌘⇧F` | Reveal in Finder | locate realPath |
| `⌘⇧X` | Copy Fix Command | **only present when the row has a health issue** |
| `⌘R` | Refresh | re-scan and refresh cache |

**Inventory → Doctor entry**: when issues exist, show a top banner item
`⚠️ N issues →` that navigates to / launches Skill Doctor.

**States**: Loading (`<List isLoading>`, ~200ms cold scan); Empty ("No skills
found in ~/.claude/skills or ~/.codex/skills"); No-match (Raycast default).

## 7. Doctor Command UX + Health Taxonomy + Fix Commands

**Health taxonomy v1** (4 issue classes + 1 info)

| # | Check | Severity | Detection |
|---|---|---|---|
| H1 | Broken symlink | 🔴 error | entry is a symlink but `realPath` missing / `stat` fails |
| H2 | SKILL.md missing or unparseable | 🔴 error | no SKILL.md, or frontmatter YAML parse throws |
| H3 | name ≠ directory name | ⚠️ warning | `frontmatter.name` ≠ `basename(realPath)` |
| H4 | Cross-surface drift | ⚠️ warning | same `name` present in Claude but not Codex (or vice versa); or both surfaces' `realPath` diverge |
| H5 | Stale plugin cache | ℹ️ info | older copies exist under `cache/<mp>/<ver>/` than the current marketplace version |

> Real example on the author's machine: `bailian-cli` directory whose
> `frontmatter.name` is `aliyun-model-studio-cli` (H3).

**Doctor screen**

```
┌─ Skill Doctor ──────────────────────────────────────────────────┐
│ 🔍 filter issues…                                  4 issues       │
├───────────────────────────────────────────────────────────────────┤
│ 🔴 Errors (1)                                                     │
│  🔴 bad-symlink-skill   Broken symlink → target missing          │
│ ⚠️ Warnings (3)                                                   │
│  ⚠️ bailian-cli         name 'aliyun-model-studio-cli' ≠ dir     │
│  ⚠️ firecrawl-scrape    Only in Claude, missing in Codex         │
│  ⚠️ rephrase            Claude/Codex point to different sources   │
│ ℹ️ Info (1)                                                       │
│  ℹ️ tighten             Stale cache: 2 old versions in cache/     │
└───────────────────────────────────────────────────────────────────┘
```

- Sections by severity (Error → Warning → Info); total count in the title area.
- Each row's subtitle states the problem in plain language.
- Selected row's detail panel shows problem details, affected paths, and the
  **suggested fix command (preview)**.

**Fix command generation** (`lib/fix-commands.ts`, pure functions). Each issue →
one copyable, **non-executed** command:

| Issue | Generated command (example) |
|---|---|
| H1 broken symlink | `# target missing, re-link or remove:`<br>`rm ~/.claude/skills/bad-symlink-skill` |
| H3 name mismatch | both directions, each commented: `# rename dir to match frontmatter.name:`<br>`mv ".../bailian-cli" ".../aliyun-model-studio-cli"` |
| H4 missing in Codex | `ln -s "<realPath>" ~/.codex/skills/firecrawl-scrape` |
| H4 diverged sources | `# diverged, inspect both:`<br>`diff -r "<claudePath>" "<codexPath>"` |
| H5 stale cache | `# old versions (safe to remove if unused):`<br>`rm -rf "<cachePath>"` |

ActionPanel: `⏎` = Copy Fix Command (with comments); `⌘O` = Open in Editor;
`⌘⇧F` = Reveal in Finder; `⌘B` = jump back to this skill in Inventory.

**Discipline**: every fix command is text → clipboard, **never `exec`**. The
Enter key on destructive `rm`/`mv` is pressed by the human in their terminal.
This is the M2' level from D6.

## 8. Cache, Refresh, Error Handling, Testing

**Cache** — Raycast `Cache` API (suited to a few hundred KB of structured data).

- Key: `skills-index-v1`
- Value: `{ scannedAt: number, skills: ParsedSkill[] }` (body truncated 2KB;
  total ~300-500KB).
- Invalidation (mtime-incremental, not full re-scan every open):
  1. On open, `readdir` enumerates all skill dirs (cheap, ~100 entries).
  2. Compare each `mtime` to the cache:
     - unchanged → use cached `ParsedSkill`
     - changed/new → re-parse that one only
     - missing → drop from cache
  3. `⌘R` forces a full re-scan, ignoring cache.
- Cold start (no cache) does full parse (~200ms); thereafter incremental.

**Error handling**

| Failure | Handling | User perception |
|---|---|---|
| Directory permission denied | skip dir, `console.error`, continue | that dir's skills absent, rest normal |
| YAML frontmatter parse fails | **no crash** → becomes H2; Inventory still shows row, name falls back to dir name, ⚠️ badge | sees the broken skill and knows it's broken |
| `~/.codex` absent | silently skip surface | only Claude shown (many users have no Codex) |
| Open-in-Editor finds no `code`/`cursor` | Toast error → fall back to `open -t` → else Reveal in Finder | always a fallback |
| Clipboard failure | Toast error (rare) | clear feedback |

Principle: a single skill's problem must never crash the whole list — scan/parse
is try/catch at per-skill granularity.

**Testing**

- Tool: `vitest` on `lib/` pure functions. Raycast `.tsx` components are hard to
  test headlessly → not strictly tested; verified via `ray develop`.
- Fixtures: `test/fixtures/` with a fake dir tree — normal skill, broken symlink,
  name mismatch, codex-only, multi-version cache.
- Must test:
  - `parser.ts`: frontmatter extraction, body split, the 3 triggerHint regexes
  - `health.ts`: H1-H5 each against fixtures
  - `fix-commands.ts`: each issue → expected command string
  - `cache.ts`: mtime-incremental invalidation (mock `Cache`)
- Target: ~80% coverage on `lib/`; `.tsx` excluded from the coverage gate.

## 9. Icon Decisions

- **Extension icon (the app icon)**: a 512×512 PNG at `assets/icon.png`, needed
  only pre-publish. Use the Raycast template placeholder during development —
  not a blocker. Final design: a simple box/puzzle motif in Catppuccin colors.
- **List-item icons**: Raycast built-in `Icon` + tintColor, not emoji (emoji
  rendering/alignment is inconsistent across macOS versions):
  - user skill → `Icon.Box` (blue)
  - plugin skill → `Icon.Plug` (purple)
  - Doctor error → `Icon.XMarkCircle` (red); warning → `Icon.Warning` (yellow);
    info → `Icon.Info` (gray)
  - surface → text tags `[claude]` / `[codex]` (`List.Item.Accessory` tag).

## 10. v2 / Future (out of scope, recorded so v1 doesn't block it)

- LLM recommendation: natural-language intent → top-N skill suggestions, fed by
  the structured `frontmatter`/`keywords` cache stored in v1.
- Copilot / OpenCode surfaces.
- Optional inline execution of fix commands (would graduate from M2' to M3').

## 11. Approaches Considered

- **A — Minimalist Launcher**: 1 command, 2 health checks, re-scan every open
  (~500-800 LOC). Ships fastest but no cross-surface diff; health story thin.
  A is a strict subset of B — if B loses steam mid-build, stopping at A's feature
  set still ships.
- **B — Workshop (chosen)**: 2 commands, 4 health checks incl. cross-surface
  drift, mtime cache (~1500-2000 LOC). Captures the unique value (cross-surface
  drift) and is the Raycast-idiomatic shape.
- **C — Power Tool**: 3 commands incl. menubar, file watcher + local embedding
  stub (~3000+ LOC). Rejected: menubar/List state-sharing pitfalls, watcher cost
  across plugin cache, YAGNI embedding, high abandonment risk.

## 12. Success Criteria

1. Open "Search Skills", type a Chinese or English fragment of a skill's purpose,
   and the right skill appears in the top few results within ~200ms.
2. `⏎` copies a usable name to paste into a Claude/Codex conversation.
3. "Skill Doctor" lists every H1-H4 issue on the author's actual machine,
   including the known `bailian-cli` H3 case, each with a copyable fix command.
4. No command ever writes to or deletes from the filesystem.
5. Runs on a machine that has only Claude Code installed (no Codex, no
   `agent-skills`) without error.
6. `lib/` unit tests pass at ~80% coverage.

## 13. Remaining Open Questions (for writing-plans)

These are implementation-detail-level, not blocking the design:

- Codex's exact plugin directory convention (assumed analogous to Claude; verify
  during implementation, handle absence gracefully).
- Editor detection order (`cursor` vs `code` vs `$EDITOR`).
- Exact `/command` format per source type for "Copy as /command".

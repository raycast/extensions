# Curator v2 — AI Skill Recommendation — Design Spec

- **Date**: 2026-05-28
- **Status**: Approved (brainstorming complete, ready for writing-plans)
- **Project root**: `~/Projects/raycast-skill-manager`
- **Builds on**: v1 (merged to `main`, commit `ab4308b`). v2 is **purely additive** — it does not modify v1's commands or `lib/` modules.
- **Approach chosen**: A ("Minimal robust") — see Approaches Considered.

---

## 1. Problem & Motivation

v1 (Curator) gives a fast fuzzy **launcher** (Search Skills) and a **health** view (Skill Doctor). Fuzzy search is great when the user's words overlap a skill's name/keywords — but it misses *semantic* matches: when you describe a task in words that don't appear in the skill's description, you can't find the skill even though it exists.

v2 adds a **natural-language recommendation**: describe what you're trying to do, and an LLM ranks the most relevant skills from your installed catalog, each with a one-line reason. This was deferred from v1 on purpose; v1 already preserved the full `SKILL.md` frontmatter in its cache precisely as the hook for this.

**What v2's LLM must earn:** it has to beat fuzzy search by doing what keyword matching can't — semantic matching + ranking + a short "why". That is the entire justification for spending an LLM call (see decision V1 below).

## 2. Locked Decisions

| # | Decision point | Answer |
|---|---|---|
| V1 | Core LLM job | **B — ranked top-N (≤5) with a one-line reason + confidence per skill.** Not single-match (too thin), not pipeline composition (deferred to v2.1), not open chat. |
| V2 | AI provider | **Both** — Raycast AI (`AI.ask`) by default, with an **OpenAI-compatible bring-your-own-key** fallback. Routing is "Auto" by default. |
| V3 | Retrieval strategy | **Send-all, compact** — every query sends the whole catalog compacted (`name + first-sentence desc + triggers`), ~5K tokens for ~100 skills. No keyword pre-filter (would reintroduce the recall gap), no embeddings (YAGNI at this scale). |
| V4 | UI placement | **New dedicated command "Recommend Skills".** v1 Search Skills stays a zero-latency fuzzy launcher. |
| V5 | Implementation shape | **A — Minimal robust**: prompt for JSON, tolerant-parse, validate names against the real catalog (drops hallucinations). Provider-agnostic. |

## 3. Scope

**In (v2)**

- New `recommend-skills` command: natural-language task → ranked ≤5 skills, each with confidence + one-line reason.
- Provider router: Raycast AI (gated by `environment.canAccess(AI)`) + OpenAI-compatible BYOK via Raycast preferences.
- Compact-catalog prompt, tolerant JSON parse, catalog-validated resolution.
- Session result cache; graceful degradation when AI is unavailable.
- Reuse of v1's `getIndex()`, `aggregateSkills()`, `SkillDetail`, and action set.

**Out (v2 — explicitly deferred)**

- Multi-skill **pipeline / workflow** composition (job C) → v2.1 once the plumbing is proven.
- **Embeddings / vector retrieval** → only if the catalog ever exceeds ~400 skills.
- Open-ended **chat** about skills (job D).
- An "Ask Curator AI" escalate-action *inside* Search Skills → cheap to add later; not in this scope.
- Streaming UI / native function-calling (rejected — see Approaches).

## 4. Architecture & Files (all additive; v1 untouched)

```
package.json                       # + "recommend-skills" command + BYOK preferences
src/
├── recommend-skills.tsx           # NEW command: query in → ranked list out
├── lib/
│   ├── llm.ts                     # provider router: chat(prompt) → string (Raycast AI | OpenAI-compatible BYOK)
│   ├── recommend.ts               # PURE: buildCatalog / buildPrompt / parseRecommendations / resolveRecommendations
│   ├── cache.ts                   # REUSE getIndex() — same catalog v1 built
│   ├── aggregate.ts               # REUSE aggregateSkills()
│   └── types.ts                   # + CatalogEntry, RawRec, Recommendation
└── components/
    ├── RecommendationItem.tsx     # NEW result row; reuses v1 SkillDetail + actions
    └── SkillDetail.tsx            # REUSE verbatim
test/
└── recommend.test.ts             # pure-function tests
```

**Boundary discipline**: `recommend.ts` is pure (no Raycast, no network) → fully unit-tested. `llm.ts` is the only new I/O module (Raycast AI or HTTP) → manual verify, excluded from coverage (same policy as v1's `cache.ts`/`actions.ts`). The command chains the pure functions around the single `chat()` call and maps `Recommendation.skill` back through v1's existing detail + actions.

**New types** (added to `types.ts`):
```ts
export type CatalogEntry = { name: string; desc: string; triggers: string[]; source: string };
export type RawRec = { name: string; confidence: string; why: string }; // straight from the LLM
export type Recommendation = {
  skill: DisplaySkill;                       // resolved real skill → reuse v1 detail/actions
  confidence: "high" | "medium" | "low";
  why: string;                               // one-line reason
};
```

## 5. Provider Router + Preferences

**Raycast preferences** (declared in `package.json`; key stored as a `password` field by Raycast, never in git):

| Pref | Type | Default | Purpose |
|---|---|---|---|
| `provider` | dropdown | `Auto` | `Auto` (Raycast AI if available, else my key) · `Raycast AI` · `My API key` |
| `apiBaseURL` | text | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI-compatible endpoint (defaulted to DashScope; Store users change it) |
| `apiKey` | password | — | user-pasted key (extensions cannot read `~/.env`) |
| `apiModel` | text | `qwen-plus` | model name for BYOK |

**`lib/llm.ts`**:
```ts
import { AI, environment, getPreferenceValues } from "@raycast/api";
export class AIUnavailableError extends Error {}

type Prefs = { provider: "auto" | "raycast" | "byok"; apiBaseURL: string; apiKey: string; apiModel: string };

export async function chat(prompt: string): Promise<string> {
  const p = getPreferenceValues<Prefs>();
  const useRaycast = p.provider === "raycast" || (p.provider === "auto" && environment.canAccess(AI));
  if (useRaycast) {
    if (!environment.canAccess(AI)) throw new AIUnavailableError("Raycast AI requires Pro");
    return await AI.ask(prompt, { creativity: "low" });
  }
  if (!p.apiBaseURL || !p.apiKey) throw new AIUnavailableError("No API key configured");
  const res = await fetch(`${p.apiBaseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify({ model: p.apiModel, messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  return (await res.json())?.choices?.[0]?.message?.content ?? "";
}
```

Note: the dropdown values are stored as `auto` / `raycast` / `byok` (titles shown to the user are "Auto" / "Raycast AI" / "My API key"). `Auto` uses Raycast AI when `canAccess(AI)`, else BYOK. The two explicit modes let the user force either (e.g., force BYOK to use Qwen and spare Raycast AI quota). If neither is usable → `AIUnavailableError`.

## 6. Recommendation Pipeline (`lib/recommend.ts` — pure)

```ts
export function firstSentence(text: string): string; // local copy (keeps module pure)

export function buildCatalog(skills: DisplaySkill[]): CatalogEntry[] {
  return skills.map((s) => ({
    name: s.name,
    desc: firstSentence(s.description),
    triggers: s.primary.triggerHints.slice(0, 4),
    source: s.source.includes("plugin") ? (s.marketplace ?? "plugin") : "user",
  }));
}

export function buildPrompt(query: string, catalog: CatalogEntry[]): string;
// Emits: role line; `User task: "<query>"`; numbered catalog lines
//   `N. <name> [<source>] — <desc> (triggers: a, b, c)`;
//   strict output contract: ONLY a JSON array of up to 5, most relevant first,
//   [{"name","confidence":"high|medium|low","why":"<=15 words"}];
//   rule: use only names verbatim from the catalog; if nothing fits, return [].
// MUST include the query and every catalog name in the output.

export function parseRecommendations(reply: string): RawRec[];
// Tolerant: regex-extract the first `[...]` block (ignores prose / ```json fences),
// JSON.parse, keep only objects with a string `name`. Any failure → []. Never throws.

export function resolveRecommendations(raw: RawRec[], skills: DisplaySkill[]): Recommendation[];
// Map name (case-insensitive) → real DisplaySkill; DROP unmatched (hallucinations);
// dedupe by skill.key; normalize confidence to high|medium|low; clamp to 5.
```

The command's orchestration (glue, not pure):
```ts
const skills = aggregateSkills((await getIndex()).skills);
const reply  = await chat(buildPrompt(query, buildCatalog(skills)));
const recs   = resolveRecommendations(parseRecommendations(reply), skills);
```

**Safety invariant**: even if the model returns malformed output or invents skill names, the worst case is an empty or shorter list — never a fabricated skill, never a crash. `resolveRecommendations` is the gate.

## 7. Command UX — "Recommend Skills" (`recommend-skills.tsx`)

One screen, launcher-style: the search bar is the **task description** (not a filter), submitted to get a ranked list.

```
┌─ Recommend Skills ───────────────────────────────────────────────┐
│ 🔍 把一篇 CNKI 论文导入 zotero 并做笔记                            │
├───────────────────────────────────────────────────────────────────┤
│ ✨ Get recommendations for "把一篇 CNKI 论文…"            ⏎        │
│ ───────────────────────────────────────────────                  │
│ ▢ cnki-zotero-import    把 CNKI 论文一键导入 Zotero     [high][c] │
│ ▢ zotero-notes          批量读 collection 生成笔记      [high][c] │
│ 🔌 academic-database…   检索 CNKI/SSRN/arXiv            [med][c]  │
└───────────────────────────────────────────────────────────────────┘
```

- `<List filtering={false}>`; `onSearchTextChange` stores the query (no per-keystroke calls). A persistent top **"✨ Get recommendations"** item runs `chat → parse → resolve` on `⏎`; `isLoading` spins; results render below.
- **Result row** (`RecommendationItem`): icon + skill name (title) + the LLM's **why** (subtitle) + accessories `[confidence]` (high=green / medium=yellow / low=grey) and surface badges `[c]/[x]`. Detail = v1 `SkillDetail` verbatim. The tiny `iconFor` helper (currently local to v1's `search-skills.tsx`, returning `{source, tintColor}`) is **duplicated** into `RecommendationItem.tsx` rather than refactoring v1 — keeping v2 strictly additive. Likewise `firstSentence` gets its own copy in `recommend.ts` (and stays pure there).
- **Actions on a result** (consistent with v1): `⏎` Copy Skill Name · `⌘⏎` Re-run recommendation · `⌘D` Toggle Detail · `⌘O` Open in Editor · `⌘⇧S` Open in Search Skills.
- **States**: empty query → top item "Type your task, then press ⏎"; loading → spinner; nothing fit (`[]`) → "No matching skill — try rephrasing"; `AIUnavailableError` → `List.EmptyView` "AI unavailable — set a key in Preferences, or use Search Skills" with actions Open Extension Preferences / Open Search Skills.

## 8. Caching, Error Handling, Testing

**Caching**: session-scoped `Map<normalizedQuery, Recommendation[]>` — re-submitting the same task reuses the last result (no duplicate paid calls). Catalog comes from `getIndex()` (v1 mtime cache, no re-scan). If the catalog is empty, skip the LLM and show "No skills found."

**Error handling** (every path degrades, never crashes):

| Situation | Behavior |
|---|---|
| `AIUnavailableError` (no Pro + no key) | `EmptyView` "AI unavailable…" + actions Open Preferences / Open Search Skills |
| HTTP non-OK / network error (BYOK) | `Toast.Failure` with status; query preserved for retry |
| Request hangs | `AbortSignal.timeout(20000)` → `Toast.Failure` "AI timed out" |
| Empty/garbage reply | `parse`/`resolve` → `[]` → "No matching skill — try rephrasing" (not an error) |
| Hallucinated names | silently dropped by `resolveRecommendations` |

**Testing**:
- `recommend.test.ts` (pure, the real correctness surface):
  - `firstSentence` boundary cases.
  - `buildCatalog` compaction (first-sentence desc, ≤4 triggers, source label).
  - `buildPrompt` includes the query and every catalog name; states the JSON contract.
  - `parseRecommendations` on: clean JSON array; JSON wrapped in prose; a ```json fenced block; an object-not-array; total garbage → `[]`.
  - `resolveRecommendations`: drops a hallucinated name; dedupes; clamps to 5; normalizes `confidence` ("High"→high, "l"→low, missing→medium).
- `llm.ts` + `recommend-skills.tsx` = Raycast/network glue → manual verify via `ray develop`; add `src/lib/llm.ts` to the vitest coverage `exclude`.
- **CI unchanged** — existing `npm ci + vitest + tsc` covers v2's pure tests + typecheck.
- Human smoke checklist: (1) Pro + Auto → Chinese task returns ranked skills with reasons; (2) force "My API key" + DashScope/Qwen key+model → same query returns results; (3) bad key → graceful Toast, no crash; (4) nonsense query → "No matching skill"; (5) non-Pro + provider=Raycast → "AI unavailable" state.

## 9. Success Criteria

1. In "Recommend Skills", type a Chinese or English *task* whose wording does **not** contain the target skill's name, press `⏎`, and the right skill appears in the top results with a sensible one-line reason — i.e., it succeeds where v1 fuzzy search fails.
2. `⏎` on a result copies a usable skill name (same as v1).
3. With `provider = My API key` + a DashScope key/model, the same query returns results via Qwen (provider-agnostic path works).
4. A wrong/missing key, a hung request, or a garbage model reply each degrade to a Toast or an empty-state — never a crash, never a fabricated skill name.
5. On a machine without Raycast Pro and no key, the command shows the "AI unavailable" state and points to Search Skills.
6. `recommend.ts` unit tests pass; `tsc` clean; CI green.

## 10. Approaches Considered

- **A — Minimal robust (chosen)**: prompt-for-JSON + tolerant parse + catalog-validated resolution. Provider-agnostic (identical on Raycast AI and any OpenAI-compatible endpoint); structured-output risk contained by parsing + validation, which also kills hallucinated names; reuses v1 cleanly.
- **B — A + streaming & rich detail**: rejected — streaming and structured-JSON parsing fight each other (can't reliably parse partial JSON); value over A is cosmetic.
- **C — Native structured output / function-calling**: rejected — Raycast AI's `AI.ask` gives no schema guarantee and BYOK providers vary, so it would need per-provider branching *plus* A's tolerant fallback anyway.

## 11. Future (recorded so v2 doesn't block it)

- **v2.1 — Pipeline composition** (job C): "task → ordered multi-skill workflow." Higher LLM value; needs a richer output schema (ordered steps + rationale) and a different result UI. The `chat()` router and compact-catalog from v2 carry straight over.
- **Embeddings retrieval**: only if the catalog exceeds ~400 skills and the send-all token cost becomes painful.
- **"Ask Curator AI" action inside Search Skills**: launch Recommend pre-filled with the current search text — a thin add once this command exists.

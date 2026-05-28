# Curator v2 — AI Skill Recommendation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Recommend Skills" Raycast command that takes a natural-language task and returns an AI-ranked top-5 of the user's installed skills, each with a one-line reason — succeeding where v1's fuzzy search fails.

**Architecture:** Purely additive to the merged v1. A pure `lib/recommend.ts` (catalog → prompt → tolerant-parse → catalog-validated resolve) is unit-tested; a thin `lib/llm.ts` routes to Raycast AI or an OpenAI-compatible BYOK endpoint; a new command + result-row component reuse v1's `getIndex`, `aggregateSkills`, and `SkillDetail`.

**Tech Stack:** TypeScript, `@raycast/api` (`AI`, preferences), global `fetch`, vitest, npm.

**Spec:** `docs/superpowers/specs/2026-05-28-curator-v2-recommendation-design.md`

---

## Pre-flight (controller, before Task 1)

- Work on a branch: `git checkout -b feat/v2` from `main`.
- **Stop any running `ray develop` watcher first.** In v1, concurrent `ray build`/`tsc`/test runs while a background watcher was live disrupted Raycast's import. Implement with the watcher OFF; restart it only for the final manual smoke test.

## File Structure

```
package.json                       # MODIFY: + preferences (Task 1) + recommend-skills command (Task 6)
vitest.config.ts                   # MODIFY: exclude src/lib/llm.ts from coverage (Task 4)
src/
├── recommend-skills.tsx           # NEW command (Task 6)
├── lib/
│   ├── types.ts                   # MODIFY: + CatalogEntry, RawRec, Recommendation (Task 2)
│   ├── recommend.ts               # NEW pure pipeline (Task 3)
│   ├── llm.ts                     # NEW provider router (Task 4)
│   ├── cache.ts                   # REUSE getIndex() (unchanged)
│   └── aggregate.ts               # REUSE aggregateSkills() (unchanged)
└── components/
    ├── RecommendationItem.tsx     # NEW result row (Task 5)
    └── SkillDetail.tsx            # REUSE (unchanged)
test/
└── recommend.test.ts             # NEW (Task 3)
```

**Note on icon names:** Raycast's `Icon` enum does not contain every name you'd guess (in v1, `Icon.Wrench` did not exist → had to use `Icon.WrenchScrewdriver`). If `npx tsc --noEmit` flags an `Icon.X` as nonexistent, replace it with the closest valid member and note it.

---

## Task 1: Add preferences to `package.json`

**Files:**
- Modify: `package.json` (add a top-level `preferences` array)

- [ ] **Step 1: Add the `preferences` array**

Insert a `preferences` array as a top-level key (e.g., right after the `commands` array). Exact content:

```json
  "preferences": [
    {
      "name": "provider",
      "title": "AI Provider",
      "description": "Which AI to use for Recommend Skills.",
      "type": "dropdown",
      "required": false,
      "default": "auto",
      "data": [
        { "title": "Auto (Raycast AI, else my key)", "value": "auto" },
        { "title": "Raycast AI", "value": "raycast" },
        { "title": "My API key", "value": "byok" }
      ]
    },
    {
      "name": "apiBaseURL",
      "title": "API Base URL",
      "description": "OpenAI-compatible endpoint (used for My API key / Auto fallback).",
      "type": "textfield",
      "required": false,
      "default": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    {
      "name": "apiKey",
      "title": "API Key",
      "description": "Your OpenAI-compatible API key.",
      "type": "password",
      "required": false
    },
    {
      "name": "apiModel",
      "title": "Model",
      "description": "Model name for your API key (e.g. qwen-plus, gpt-4o-mini).",
      "type": "textfield",
      "required": false,
      "default": "qwen-plus"
    }
  ],
```

(Mind the JSON commas — `preferences` is a sibling of `commands`/`dependencies`.)

- [ ] **Step 2: Validate manifest + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; `ray build` prints "built extension successfully" (the two existing commands still build; preferences are well-formed).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add AI provider preferences for Recommend Skills"
```

---

## Task 2: Add v2 types

**Files:**
- Modify: `src/lib/types.ts` (append three exported types)

- [ ] **Step 1: Append to `src/lib/types.ts`**

```ts
export type CatalogEntry = { name: string; desc: string; triggers: string[]; source: string };

export type RawRec = { name: string; confidence: string; why: string };

export type Recommendation = {
  skill: DisplaySkill;
  confidence: "high" | "medium" | "low";
  why: string;
};
```

(`DisplaySkill` is already defined in this file — these go at the end.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add CatalogEntry, RawRec, Recommendation types"
```

---

## Task 3: Recommendation pipeline `lib/recommend.ts` (TDD)

**Files:**
- Create: `src/lib/recommend.ts`
- Test: `test/recommend.test.ts`

- [ ] **Step 1: Write the failing test** — `test/recommend.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  firstSentence,
  buildCatalog,
  buildPrompt,
  parseRecommendations,
  resolveRecommendations,
} from "../src/lib/recommend";
import type { DisplaySkill, ParsedSkill, SourceType } from "../src/lib/types";

function ds(
  name: string,
  opts: { description?: string; triggers?: string[]; source?: SourceType; marketplace?: string } = {},
): DisplaySkill {
  const realPath = "/r/" + name;
  const primary: ParsedSkill = {
    id: name,
    name,
    description: opts.description ?? "",
    surface: "claude",
    source: opts.source ?? "claude-user",
    marketplace: opts.marketplace,
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: 0,
    triggerHints: opts.triggers ?? [],
    keywords: [],
  };
  return {
    key: realPath,
    name,
    description: opts.description ?? "",
    surfaces: ["claude"],
    source: opts.source ?? "claude-user",
    marketplace: opts.marketplace,
    keywords: [],
    primary,
  };
}

describe("firstSentence", () => {
  it("cuts at the first terminator", () => {
    expect(firstSentence("Scrape the web. More text.")).toBe("Scrape the web.");
    expect(firstSentence("抓网页。第二句。")).toBe("抓网页。");
  });
  it("falls back to 80 chars when no terminator", () => {
    expect(firstSentence("x".repeat(100)).length).toBe(80);
  });
});

describe("buildCatalog", () => {
  it("compacts: first-sentence desc, <=4 triggers, source label", () => {
    const cat = buildCatalog([
      ds("firecrawl", {
        description: "Scrape the web. Second.",
        triggers: ["a", "b", "c", "d", "e", "f"],
        source: "claude-plugin-marketplace",
        marketplace: "sp",
      }),
      ds("mine", { description: "Local thing.", source: "claude-user" }),
    ]);
    expect(cat[0]).toEqual({ name: "firecrawl", desc: "Scrape the web.", triggers: ["a", "b", "c", "d"], source: "sp" });
    expect(cat[1].source).toBe("user");
  });
});

describe("buildPrompt", () => {
  it("includes the query and every catalog name and the JSON contract", () => {
    const cat = buildCatalog([ds("alpha", { description: "A." }), ds("beta", { description: "B." })]);
    const p = buildPrompt("do a thing", cat);
    expect(p).toContain('"do a thing"');
    expect(p).toContain("alpha");
    expect(p).toContain("beta");
    expect(p).toContain('"confidence"');
  });
});

describe("parseRecommendations", () => {
  it("parses a clean JSON array", () => {
    const r = parseRecommendations('[{"name":"a","confidence":"high","why":"r"}]');
    expect(r).toEqual([{ name: "a", confidence: "high", why: "r" }]);
  });
  it("extracts JSON wrapped in prose", () => {
    const r = parseRecommendations('Sure:\n[{"name":"a","confidence":"low","why":"x"}]\nDone');
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("a");
  });
  it("extracts JSON from a fenced block", () => {
    const r = parseRecommendations('```json\n[{"name":"b","confidence":"medium","why":""}]\n```');
    expect(r[0].name).toBe("b");
  });
  it("defaults missing confidence/why", () => {
    const r = parseRecommendations('[{"name":"a"}]');
    expect(r[0]).toEqual({ name: "a", confidence: "medium", why: "" });
  });
  it("returns [] for object-not-array, invalid json, and garbage", () => {
    expect(parseRecommendations('{"name":"a"}')).toEqual([]);
    expect(parseRecommendations("[{name: a}]")).toEqual([]);
    expect(parseRecommendations("no json here")).toEqual([]);
  });
});

describe("resolveRecommendations", () => {
  const skills = [ds("alpha"), ds("beta"), ds("gamma")];
  it("drops hallucinated names not in the catalog", () => {
    const out = resolveRecommendations(
      [{ name: "alpha", confidence: "high", why: "" }, { name: "ghost", confidence: "high", why: "" }],
      skills,
    );
    expect(out.map((r) => r.skill.name)).toEqual(["alpha"]);
  });
  it("dedupes by skill and is case-insensitive", () => {
    const out = resolveRecommendations(
      [{ name: "Alpha", confidence: "high", why: "" }, { name: "alpha", confidence: "low", why: "" }],
      skills,
    );
    expect(out).toHaveLength(1);
  });
  it("normalizes confidence", () => {
    const out = resolveRecommendations(
      [
        { name: "alpha", confidence: "High", why: "" },
        { name: "beta", confidence: "l", why: "" },
        { name: "gamma", confidence: "weird", why: "" },
      ],
      skills,
    );
    expect(out.map((r) => r.confidence)).toEqual(["high", "low", "medium"]);
  });
  it("clamps to 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => ds("s" + i));
    const raw = many.map((s) => ({ name: s.name, confidence: "high", why: "" }));
    expect(resolveRecommendations(raw, many)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/recommend.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/recommend'".

- [ ] **Step 3: Write `src/lib/recommend.ts`**

```ts
import type { CatalogEntry, DisplaySkill, RawRec, Recommendation } from "./types";

export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.。!?]/);
  return stop > 0 ? t.slice(0, stop + 1) : t.slice(0, 80);
}

export function buildCatalog(skills: DisplaySkill[]): CatalogEntry[] {
  return skills.map((s) => ({
    name: s.name,
    desc: firstSentence(s.description),
    triggers: s.primary.triggerHints.slice(0, 4),
    source: s.source.includes("plugin") ? (s.marketplace ?? "plugin") : "user",
  }));
}

export function buildPrompt(query: string, catalog: CatalogEntry[]): string {
  const lines = catalog
    .map((c, i) => {
      const trig = c.triggers.length ? ` (triggers: ${c.triggers.join(", ")})` : "";
      return `${i + 1}. ${c.name} [${c.source}] — ${c.desc}${trig}`;
    })
    .join("\n");
  return [
    "You help pick the most relevant skills for a user's task from a fixed catalog.",
    `User task: "${query}"`,
    "",
    `Catalog (${catalog.length} skills):`,
    lines,
    "",
    "Return ONLY a JSON array of up to 5 skills, most relevant first:",
    '[{"name":"<exact catalog name>","confidence":"high|medium|low","why":"<=15 words"}]',
    "Rules: use only names that appear verbatim in the catalog; if nothing fits, return [].",
  ].join("\n");
}

export function parseRecommendations(reply: string): RawRec[] {
  const m = reply.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(m[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: RawRec[] = [];
  for (const item of arr) {
    if (item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string") {
      const o = item as { name: string; confidence?: unknown; why?: unknown };
      out.push({
        name: o.name,
        confidence: typeof o.confidence === "string" ? o.confidence : "medium",
        why: typeof o.why === "string" ? o.why : "",
      });
    }
  }
  return out;
}

function normalizeConfidence(c: string): "high" | "medium" | "low" {
  const v = c.trim().toLowerCase();
  if (v.startsWith("h")) return "high";
  if (v.startsWith("l")) return "low";
  return "medium";
}

export function resolveRecommendations(raw: RawRec[], skills: DisplaySkill[]): Recommendation[] {
  const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const r of raw) {
    const skill = byName.get(r.name.trim().toLowerCase());
    if (!skill || seen.has(skill.key)) continue;
    seen.add(skill.key);
    out.push({ skill, confidence: normalizeConfidence(r.confidence), why: r.why.trim() });
    if (out.length >= 5) break;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/recommend.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Type-check + full suite (no regressions)**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; all tests (v1's 34 + v2's new) pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recommend.ts test/recommend.test.ts
git commit -m "feat: add recommendation pipeline (catalog/prompt/parse/resolve)"
```

---

## Task 4: Provider router `lib/llm.ts`

**Files:**
- Create: `src/lib/llm.ts`
- Modify: `vitest.config.ts` (coverage exclude)

This module imports `@raycast/api` and does network I/O → no unit test (verified by tsc + manual smoke), excluded from coverage like v1's `cache.ts`/`actions.ts`.

- [ ] **Step 1: Write `src/lib/llm.ts`**

```ts
import { AI, environment, getPreferenceValues } from "@raycast/api";

export class AIUnavailableError extends Error {}

type Prefs = {
  provider: "auto" | "raycast" | "byok";
  apiBaseURL: string;
  apiKey: string;
  apiModel: string;
};

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
    body: JSON.stringify({
      model: p.apiModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
```

- [ ] **Step 2: Exclude `llm.ts` from coverage** — modify `vitest.config.ts`:

Change this line:
```ts
    coverage: { include: ["src/lib/**/*.ts"], exclude: ["src/lib/cache.ts", "src/lib/actions.ts"] },
```
to:
```ts
    coverage: { include: ["src/lib/**/*.ts"], exclude: ["src/lib/cache.ts", "src/lib/actions.ts", "src/lib/llm.ts"] },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If tsc complains `AI`/`environment` not exported — they are in `@raycast/api`; re-check the import.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/llm.ts vitest.config.ts
git commit -m "feat: add AI provider router (Raycast AI + OpenAI-compatible BYOK)"
```

---

## Task 5: Result row `components/RecommendationItem.tsx`

**Files:**
- Create: `src/components/RecommendationItem.tsx`

Reuses v1's `SkillDetail` and `actions`; duplicates the tiny `iconFor` (v1's is local to `search-skills.tsx`) to keep v2 additive.

- [ ] **Step 1: Write `src/components/RecommendationItem.tsx`**

```tsx
import { List, ActionPanel, Action, Icon, Color, launchCommand, LaunchType } from "@raycast/api";
import { join } from "node:path";
import { copyToClipboard, openInEditor } from "../lib/actions";
import { SkillDetail } from "./SkillDetail";
import type { Recommendation } from "../lib/types";

function iconFor(rec: Recommendation) {
  return rec.skill.source.includes("plugin")
    ? { source: Icon.Plug, tintColor: Color.Purple }
    : { source: Icon.Box, tintColor: Color.Blue };
}

const CONF: Record<Recommendation["confidence"], { value: string; color: Color }> = {
  high: { value: "high", color: Color.Green },
  medium: { value: "medium", color: Color.Yellow },
  low: { value: "low", color: Color.SecondaryText },
};

export function RecommendationItem({
  rec,
  onRerun,
  onToggleDetail,
}: {
  rec: Recommendation;
  onRerun: () => void;
  onToggleDetail: () => void;
}) {
  const s = rec.skill;
  const conf = CONF[rec.confidence];
  const slash = s.source.includes("plugin") && s.marketplace ? `/${s.marketplace}:${s.name}` : `/${s.name}`;
  return (
    <List.Item
      icon={iconFor(rec)}
      title={s.name}
      subtitle={rec.why}
      accessories={[...s.surfaces.map((surf) => ({ tag: surf })), { tag: { value: conf.value, color: conf.color } }]}
      detail={<SkillDetail skill={s} issues={[]} />}
      actions={
        <ActionPanel>
          <Action title="Copy Skill Name" icon={Icon.Clipboard} onAction={() => copyToClipboard(s.name)} />
          <Action
            title="Re-run Recommendation"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onRerun}
          />
          <Action
            title="Toggle Detail"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Copy as /command"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copyToClipboard(slash)}
          />
          <Action
            title="Open in Editor"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => openInEditor(join(s.primary.realPath, "SKILL.md"))}
          />
          <Action.ShowInFinder path={s.primary.realPath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          <Action
            title="Open in Search Skills"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() => launchCommand({ name: "search-skills", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `Icon.Sidebar` or any `Icon.X` is flagged nonexistent, swap for the closest valid member (e.g., `Icon.AppWindowSidebarLeft`) and note it.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecommendationItem.tsx
git commit -m "feat: add RecommendationItem result row"
```

---

## Task 6: Command `recommend-skills.tsx` + register it

**Files:**
- Create: `src/recommend-skills.tsx`
- Modify: `package.json` (add the `recommend-skills` command)

- [ ] **Step 1: Add the command to `package.json`** — add this object to the `commands` array (after `skill-doctor`):

```json
    {
      "name": "recommend-skills",
      "title": "Recommend Skills",
      "subtitle": "Curator",
      "description": "Describe a task; AI ranks the most relevant installed skills.",
      "mode": "view"
    }
```

- [ ] **Step 2: Write `src/recommend-skills.tsx`**

```tsx
import { useRef, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { getIndex } from "./lib/cache";
import { aggregateSkills } from "./lib/aggregate";
import { buildCatalog, buildPrompt, parseRecommendations, resolveRecommendations } from "./lib/recommend";
import { chat, AIUnavailableError } from "./lib/llm";
import { RecommendationItem } from "./components/RecommendationItem";
import type { Recommendation } from "./lib/types";

export default function Command() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [showingDetail, setShowingDetail] = useState(false);
  const cache = useRef(new Map<string, Recommendation[]>());

  async function run() {
    const q = query.trim();
    if (!q) return;
    const cached = cache.current.get(q);
    if (cached) {
      setRecs(cached);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    try {
      const skills = aggregateSkills((await getIndex()).skills);
      if (skills.length === 0) {
        setRecs([]);
        return;
      }
      const reply = await chat(buildPrompt(q, buildCatalog(skills)));
      const result = resolveRecommendations(parseRecommendations(reply), skills);
      cache.current.set(q, result);
      setRecs(result);
    } catch (e) {
      if (e instanceof AIUnavailableError) {
        setUnavailable(true);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Recommendation failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (unavailable) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Stars}
          title="AI unavailable"
          description="Set an API key in Preferences, or use Search Skills."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Open Search Skills"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "search-skills", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={loading}
      isShowingDetail={showingDetail}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Describe your task, then press ⏎"
    >
      <List.Item
        icon={Icon.Stars}
        title={query.trim() ? `Get recommendations for "${query.trim()}"` : "Type your task, then press ⏎"}
        actions={
          <ActionPanel>
            <Action title="Get Recommendations" icon={Icon.Stars} onAction={run} />
          </ActionPanel>
        }
      />
      {recs?.length === 0 && !loading && (
        <List.Item icon={Icon.QuestionMark} title="No matching skill — try rephrasing" />
      )}
      {recs?.map((rec) => (
        <RecommendationItem
          key={rec.skill.key}
          rec={rec}
          onRerun={run}
          onToggleDetail={() => setShowingDetail((v) => !v)}
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; `ray build` lists 3 entry points (`search-skills`, `skill-doctor`, `recommend-skills`) and prints "built extension successfully". If `Icon.Stars`/`Icon.QuestionMark`/`Icon.Gear` is flagged, swap for the closest valid member and note it.

- [ ] **Step 4: Manual verification** — DEFERRED TO HUMAN (needs Raycast GUI + a Pro account or a BYOK key). Do not attempt `npm run dev`. Note in report.

- [ ] **Step 5: Commit**

```bash
git add package.json src/recommend-skills.tsx
git commit -m "feat: add Recommend Skills command"
```

---

## Task 7: Polish — full verification

**Files:** none (verification + optional fixes)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all test files pass (v1's 34 + v2's recommend tests).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: `validate package.json`, `validate extension icons`, ESLint, Prettier all "ready". If autofixable, run `npm run fix-lint` then re-run; report any files changed.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; "built extension successfully".

- [ ] **Step 4: Manual smoke checklist** — DEFERRED TO HUMAN (run `npm run dev` in a terminal, then in Raycast):
  1. Pro + provider Auto: type a Chinese task whose words don't contain the skill name → ranked skills with reasons appear.
  2. provider "My API key" + DashScope key/model → same query returns results via Qwen.
  3. Bad key → graceful Failure toast, no crash.
  4. Nonsense query → "No matching skill — try rephrasing".
  5. provider "Raycast AI" on a machine without Pro → "AI unavailable" empty state with the two actions.

- [ ] **Step 5: Commit (only if lint changed files)**

```bash
git add -A
git commit -m "chore: lint/format pass for v2"
```

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| New "Recommend Skills" command | Task 6 |
| Ranked top-5 + reason + confidence (job B) | Task 3 (resolve clamps 5) + Task 5 (confidence accessory, why subtitle) |
| Provider router: Raycast AI + OpenAI-compatible BYOK | Task 4 |
| Preferences (provider/baseURL/key/model) | Task 1 |
| Send-all compact catalog | Task 3 (`buildCatalog`) |
| Tolerant JSON parse | Task 3 (`parseRecommendations`) |
| Catalog validation drops hallucinations | Task 3 (`resolveRecommendations`) |
| Session cache | Task 6 (`useRef` Map) |
| Reuse getIndex/aggregateSkills/SkillDetail | Tasks 5, 6 |
| Graceful AI-unavailable / errors / timeout | Task 4 (`AIUnavailableError`, `AbortSignal.timeout`) + Task 6 (catch → empty state / toast) |
| One-screen launcher UX | Task 6 |
| Tests on pure core; glue excluded from coverage | Task 3 (tests) + Task 4 (coverage exclude) |
| CI unchanged | n/a (existing CI runs vitest+tsc on the new test automatically) |

No spec requirement is left without a task.

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every command step states expected output. The only deferred items are the human-only manual Raycast smoke tests (Tasks 6/7), explicitly flagged — not plan placeholders.

**3. Type consistency:** `CatalogEntry`/`RawRec`/`Recommendation` defined in Task 2 are used with identical field names in Tasks 3/5/6. `chat(prompt: string): Promise<string>` and `AIUnavailableError` from Task 4 are imported and used exactly so in Task 6. `buildCatalog`/`buildPrompt`/`parseRecommendations`/`resolveRecommendations` signatures match between Task 3's definitions and Task 6's call site. `RecommendationItem` props `{ rec, onRerun, onToggleDetail }` (Task 5) match the call in Task 6. `SkillDetail({ skill, issues })` is called with `issues={[]}` (Task 5), matching v1's signature.

---

## Notes for the implementer

- `getPreferenceValues<Prefs>()` requires the `package.json` preferences from Task 1 to exist — that's why Task 1 comes first.
- The command registers in `package.json` (Task 6 Step 1) only once `recommend-skills.tsx` exists in the same task, so `ray build` never sees a command without an entry file.
- Keep the dev watcher OFF during implementation; concurrent `ray build`/`tsc`/vitest runs disrupted Raycast's import in v1. Restart `npm run dev` only for the Task 7 manual smoke test.

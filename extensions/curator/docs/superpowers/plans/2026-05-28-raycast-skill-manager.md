# Raycast Skill Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Raycast extension that lists installed Claude + Codex skills (searchable launcher) and health-checks them (Skill Doctor), copying fix commands to the clipboard without ever writing the filesystem.

**Architecture:** A pure `lib/` core (scan → parse → aggregate → health → fix-command, plus a cache/reconcile layer) with zero React dependency, unit-tested with vitest. Two thin Raycast `view` commands (`search-skills.tsx`, `skill-doctor.tsx`) render the core through `<List>`. No dependency on the author's private `agent-skills` bash tool.

**Tech Stack:** TypeScript, `@raycast/api`, `js-yaml`, Node `fs/promises`, vitest, npm.

**Spec:** `docs/superpowers/specs/2026-05-28-raycast-skill-manager-design.md`

---

## File Structure

```
package.json                       # Raycast manifest + scripts + deps
tsconfig.json
vitest.config.ts
.gitignore
src/
├── search-skills.tsx              # Command 1: Inventory (List + Detail)
├── skill-doctor.tsx               # Command 2: Health issue list
├── lib/
│   ├── types.ts                   # all shared types (no runtime code)
│   ├── parser.ts                  # SKILL.md text → ParsedSkill (pure)
│   ├── scanner.ts                 # walk dirs → RawSkillEntry[] (fs, home injectable)
│   ├── aggregate.ts               # ParsedSkill[] → DisplaySkill[] for inventory (pure)
│   ├── health.ts                  # ParsedSkill[] → HealthIssue[] (pure)
│   ├── fix-commands.ts            # HealthIssue → shell command string (pure)
│   ├── reconcile.ts               # mtime-incremental index build (pure, async parse fn)
│   ├── cache.ts                   # Raycast Cache persistence + getIndex orchestrator
│   └── actions.ts                 # openInEditor + clipboard helpers (Raycast)
└── components/
    ├── SkillDetail.tsx            # right-hand detail panel for a DisplaySkill
    └── IssueListItem.tsx          # a Doctor row
test/
├── fixtures/                      # fake skill trees built at runtime by tests
├── parser.test.ts
├── scanner.test.ts
├── aggregate.test.ts
├── health.test.ts
├── fix-commands.test.ts
└── reconcile.test.ts
assets/
└── icon.png                       # placeholder during dev; real icon pre-publish
```

**Responsibility boundaries:** `lib/*` is the testable brain. `parser`/`aggregate`/`health`/`fix-commands`/`reconcile` are pure (no `@raycast/api`, no direct fs side effects beyond `scanner`). `scanner` is the only fs reader and takes `home` as a parameter so tests point it at a temp tree. `cache`/`actions` are the only modules importing `@raycast/api`, so vitest never has to load the Raycast runtime.

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `assets/icon.png` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "skill-manager",
  "title": "Skill Manager",
  "description": "Browse and health-check your installed Claude & Codex skills.",
  "icon": "icon.png",
  "author": "xianweizhang",
  "categories": ["Developer Tools"],
  "license": "MIT",
  "commands": [
    {
      "name": "search-skills",
      "title": "Search Skills",
      "subtitle": "Skill Manager",
      "description": "Search installed Claude & Codex skills and copy their names/triggers.",
      "mode": "view"
    },
    {
      "name": "skill-doctor",
      "title": "Skill Doctor",
      "subtitle": "Skill Manager",
      "description": "Health-check installed skills and copy fix commands.",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.79.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.73",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.3",
    "vitest": "^1.4.0"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "test/**/*"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    coverage: { include: ["src/lib/**/*.ts"], exclude: ["src/lib/cache.ts", "src/lib/actions.ts"] },
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules
dist
.DS_Store
*.log
coverage
.raycast-swift-build
.swiftpm
raycast-env.d.ts
```

- [ ] **Step 5: Create a placeholder icon**

Run (creates a 1×1 transparent PNG so `ray` doesn't complain during dev; real icon comes in Task 12):

```bash
mkdir -p assets && printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icon.png
```

- [ ] **Step 6: Install dependencies**

Run: `cd ~/Projects/raycast-skill-manager && npm install`
Expected: dependencies install; `node_modules/.bin/ray` and `node_modules/.bin/vitest` exist.

- [ ] **Step 7: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: vitest exits 0 with "No test files found" (acceptable) — or create `test/` dir first if it errors on missing dir: `mkdir -p test/fixtures`.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore assets/icon.png
git commit -m "chore: scaffold raycast-skill-manager extension"
```

---

## Task 2: Shared types (`lib/types.ts`)

**Files:**
- Create: `src/lib/types.ts`

Type-only file; no unit test (no runtime behavior). Verified by `tsc` in later tasks.

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export type Surface = "claude" | "codex";

export type SourceType =
  | "claude-user"
  | "claude-plugin-marketplace"
  | "claude-plugin-nested"
  | "claude-plugin-cache"
  | "codex-user"
  | "codex-plugin-marketplace"
  | "codex-plugin-nested"
  | "codex-plugin-cache";

/** Raw scan result before SKILL.md is read/parsed. */
export type RawSkillEntry = {
  entryPath: string; // path as discovered (may be a symlink)
  realPath: string; // symlink-resolved; equals entryPath if not a symlink or if broken
  isSymlink: boolean;
  isBroken: boolean; // symlink whose target is missing
  skillMdExists: boolean;
  surface: Surface;
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  pluginVersion?: string;
  fileMtime: number | null; // mtimeMs of SKILL.md (or dir); null if unknown
};

/** A fully parsed skill — the single currency through the app. */
export type ParsedSkill = {
  id: string; // sha1(realPath).slice(0,12), stable across scans
  name: string; // frontmatter.name or basename(realPath)
  description: string;
  surface: Surface;
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  pluginVersion?: string;
  entryPath: string;
  realPath: string;
  isSymlink: boolean;
  isBroken: boolean;
  skillMdExists: boolean;
  parseError?: string; // set when SKILL.md missing / broken / YAML-invalid
  frontmatter: Record<string, unknown>; // full, preserved (v2 LLM hook)
  body: string; // SKILL.md body sans frontmatter, truncated to 2KB
  fileMtime: number; // 0 if unknown
  triggerHints: string[];
  keywords: string[];
};

/** One inventory row (may merge several ParsedSkills across surfaces). */
export type DisplaySkill = {
  key: string; // dedup key (realPath)
  name: string;
  description: string;
  surfaces: Surface[];
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  keywords: string[];
  primary: ParsedSkill; // representative instance for paths/body/triggers
};

export type HealthSeverity = "error" | "warning" | "info";

export type HealthIssue = {
  id: string; // stable per (check, skill)
  check: "H1" | "H2" | "H3" | "H4" | "H5";
  severity: HealthSeverity;
  skillName: string;
  message: string;
  affectedPaths: string[];
  meta: Record<string, string>; // extra data for fix-command generation
};

export type SkillIndex = {
  scannedAt: number;
  skills: ParsedSkill[];
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (no other source files import it yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared types for skill model"
```

---

## Task 3: Parser (`lib/parser.ts`)

**Files:**
- Create: `src/lib/parser.ts`
- Test: `test/parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/parser.test.ts
import { describe, it, expect } from "vitest";
import { skillId, splitFrontmatter, extractTriggerHints, tokenizeKeywords, parseEntry } from "../src/lib/parser";
import type { RawSkillEntry } from "../src/lib/types";

function entry(over: Partial<RawSkillEntry> = {}): RawSkillEntry {
  return {
    entryPath: "/home/.claude/skills/firecrawl",
    realPath: "/repo/skills/firecrawl",
    isSymlink: true,
    isBroken: false,
    skillMdExists: true,
    surface: "claude",
    source: "claude-user",
    fileMtime: 123,
    ...over,
  };
}

describe("splitFrontmatter", () => {
  it("splits valid frontmatter and body", () => {
    const r = splitFrontmatter('---\nname: foo\ndescription: bar\n---\nHello body');
    expect(r.frontmatter).toEqual({ name: "foo", description: "bar" });
    expect(r.body).toBe("Hello body");
    expect(r.error).toBeUndefined();
  });
  it("reports error when no frontmatter", () => {
    const r = splitFrontmatter("just text");
    expect(r.error).toBeDefined();
    expect(r.body).toBe("just text");
  });
  it("reports error on invalid yaml", () => {
    const r = splitFrontmatter("---\nname: : :\n---\nbody");
    expect(r.error).toMatch(/yaml/i);
  });
});

describe("extractTriggerHints", () => {
  it("captures quoted phrases", () => {
    expect(extractTriggerHints('Use when user says "scrape", "grab this"')).toEqual(
      expect.arrayContaining(["scrape", "grab this"]),
    );
  });
  it("captures trigger words list", () => {
    expect(extractTriggerHints("Trigger words: alpha, beta, gamma")).toEqual(
      expect.arrayContaining(["alpha", "beta", "gamma"]),
    );
  });
});

describe("tokenizeKeywords", () => {
  it("lowercases, splits, drops 1-char tokens", () => {
    const k = tokenizeKeywords("Scrape a URL, 抓网页 fast");
    expect(k).toContain("scrape");
    expect(k).toContain("url");
    expect(k).toContain("抓网页");
    expect(k).not.toContain("a");
  });
});

describe("skillId", () => {
  it("is stable for the same path", () => {
    expect(skillId("/x/y")).toBe(skillId("/x/y"));
    expect(skillId("/x/y")).not.toBe(skillId("/x/z"));
  });
});

describe("parseEntry", () => {
  it("parses a normal skill", () => {
    const md = "---\nname: firecrawl\ndescription: Scrape the web\n---\nBody text";
    const s = parseEntry(entry(), md);
    expect(s.name).toBe("firecrawl");
    expect(s.description).toBe("Scrape the web");
    expect(s.body).toBe("Body text");
    expect(s.parseError).toBeUndefined();
    expect(s.id).toBe(skillId("/repo/skills/firecrawl"));
  });
  it("falls back to dir name when frontmatter.name missing", () => {
    const s = parseEntry(entry(), "---\ndescription: x\n---\nbody");
    expect(s.name).toBe("firecrawl"); // basename of realPath
  });
  it("marks broken symlink", () => {
    const s = parseEntry(entry({ isBroken: true }), null);
    expect(s.parseError).toMatch(/broken/i);
  });
  it("marks missing SKILL.md", () => {
    const s = parseEntry(entry({ skillMdExists: false }), null);
    expect(s.parseError).toMatch(/missing/i);
  });
  it("truncates body to 2KB", () => {
    const big = "x".repeat(5000);
    const s = parseEntry(entry(), `---\nname: a\n---\n${big}`);
    expect(s.body.length).toBe(2048);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/parser.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/parser'".

- [ ] **Step 3: Write `src/lib/parser.ts`**

```ts
import { createHash } from "node:crypto";
import { basename } from "node:path";
import yaml from "js-yaml";
import type { ParsedSkill, RawSkillEntry } from "./types";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function skillId(realPath: string): string {
  return createHash("sha1").update(realPath).digest("hex").slice(0, 12);
}

export function splitFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  error?: string;
} {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: {}, body: raw.trim(), error: "no frontmatter block" };
  try {
    const fm = yaml.load(m[1]);
    if (typeof fm !== "object" || fm === null) {
      return { frontmatter: {}, body: m[2].trim(), error: "frontmatter is not a map" };
    }
    return { frontmatter: fm as Record<string, unknown>, body: m[2].trim() };
  } catch (e) {
    return { frontmatter: {}, body: m[2]?.trim() ?? "", error: `yaml error: ${(e as Error).message}` };
  }
}

export function extractTriggerHints(description: string): string[] {
  const hints = new Set<string>();
  for (const m of description.matchAll(/"([^"]{2,40})"/g)) hints.add(m[1].trim());
  const tw = description.match(/[Tt]rigger words?:\s*([^.\n]+)/);
  if (tw) tw[1].split(",").forEach((s) => { const t = s.trim(); if (t) hints.add(t); });
  const uw = description.match(/[Uu]se when ([^.]{3,120})\./);
  if (uw) hints.add(`use when ${uw[1].trim()}`);
  return [...hints];
}

export function tokenizeKeywords(description: string): string[] {
  const toks = description
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2);
  return [...new Set(toks)].slice(0, 50);
}

export function parseEntry(entry: RawSkillEntry, rawMd: string | null): ParsedSkill {
  const dirName = basename(entry.realPath);
  let frontmatter: Record<string, unknown> = {};
  let body = "";
  let parseError: string | undefined;

  if (entry.isBroken) {
    parseError = "broken symlink: target missing";
  } else if (!entry.skillMdExists || rawMd === null) {
    parseError = "SKILL.md missing";
  } else {
    const r = splitFrontmatter(rawMd);
    frontmatter = r.frontmatter;
    body = r.body;
    if (r.error) parseError = r.error;
  }

  const name =
    typeof frontmatter.name === "string" && frontmatter.name.trim()
      ? frontmatter.name.trim()
      : dirName;
  const description = typeof frontmatter.description === "string" ? frontmatter.description : "";

  return {
    id: skillId(entry.realPath),
    name,
    description,
    surface: entry.surface,
    source: entry.source,
    marketplace: entry.marketplace,
    pluginName: entry.pluginName,
    pluginVersion: entry.pluginVersion,
    entryPath: entry.entryPath,
    realPath: entry.realPath,
    isSymlink: entry.isSymlink,
    isBroken: entry.isBroken,
    skillMdExists: entry.skillMdExists,
    parseError,
    frontmatter,
    body: body.slice(0, 2048),
    fileMtime: entry.fileMtime ?? 0,
    triggerHints: extractTriggerHints(description),
    keywords: tokenizeKeywords(description),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/parser.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser.ts test/parser.test.ts
git commit -m "feat: add SKILL.md parser with trigger/keyword extraction"
```

---

## Task 4: Scanner (`lib/scanner.ts`)

**Files:**
- Create: `src/lib/scanner.ts`
- Test: `test/scanner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/scanner.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanSkills } from "../src/lib/scanner";

let home: string;
let srcRepo: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "skm-home-"));
  srcRepo = await mkdtemp(join(tmpdir(), "skm-src-"));

  // a real source skill
  const fc = join(srcRepo, "firecrawl");
  await mkdir(fc, { recursive: true });
  await writeFile(join(fc, "SKILL.md"), "---\nname: firecrawl\ndescription: Scrape\n---\nbody");

  // claude user: symlink to source
  await mkdir(join(home, ".claude/skills"), { recursive: true });
  await symlink(fc, join(home, ".claude/skills/firecrawl"));

  // claude user: broken symlink
  await symlink(join(srcRepo, "does-not-exist"), join(home, ".claude/skills/ghost"));

  // codex user: same source (shared) → drift-free
  await mkdir(join(home, ".codex/skills"), { recursive: true });
  await symlink(fc, join(home, ".codex/skills/firecrawl"));

  // claude plugin marketplace
  const mp = join(home, ".claude/plugins/marketplaces/superpowers/skills/brainstorming");
  await mkdir(mp, { recursive: true });
  await writeFile(join(mp, "SKILL.md"), "---\nname: brainstorming\ndescription: ideas\n---\nb");
});

afterAll(async () => {
  await rm(home, { recursive: true, force: true });
  await rm(srcRepo, { recursive: true, force: true });
});

describe("scanSkills", () => {
  it("finds user, plugin, and broken-symlink entries", async () => {
    const entries = await scanSkills(home);
    const byName = (p: string) => entries.filter((e) => e.entryPath.endsWith(p));

    expect(byName("/firecrawl").length).toBe(2); // claude + codex
    expect(entries.find((e) => e.source === "claude-plugin-marketplace")?.marketplace).toBe("superpowers");

    const ghost = entries.find((e) => e.entryPath.endsWith("/ghost"));
    expect(ghost?.isBroken).toBe(true);
    expect(ghost?.skillMdExists).toBe(false);

    const fc = entries.find((e) => e.source === "claude-user" && e.entryPath.endsWith("/firecrawl"));
    expect(fc?.isSymlink).toBe(true);
    expect(fc?.skillMdExists).toBe(true);
    expect(fc?.fileMtime).toBeTypeOf("number");
  });

  it("returns empty for a home with no skill dirs", async () => {
    const empty = await mkdtemp(join(tmpdir(), "skm-empty-"));
    expect(await scanSkills(empty)).toEqual([]);
    await rm(empty, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/scanner.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/scanner'".

- [ ] **Step 3: Write `src/lib/scanner.ts`**

```ts
import { readdir, lstat, stat, realpath } from "node:fs/promises";
import { join } from "node:path";
import type { RawSkillEntry, SourceType, Surface } from "./types";

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(p: string): Promise<string[]> {
  try {
    const names = await readdir(p);
    return names.filter((n) => !n.startsWith("."));
  } catch {
    return [];
  }
}

async function inspectEntry(
  entryPath: string,
  surface: Surface,
  source: SourceType,
  extra: Partial<RawSkillEntry>,
): Promise<RawSkillEntry | null> {
  let isSymlink = false;
  let isBroken = false;
  let realPath = entryPath;
  let fileMtime: number | null = null;
  let skillMdExists = false;

  try {
    const ls = await lstat(entryPath);
    isSymlink = ls.isSymbolicLink();
    if (isSymlink) {
      try {
        realPath = await realpath(entryPath);
      } catch {
        isBroken = true;
      }
    }
    if (!isBroken) {
      const st = await stat(realPath);
      if (!st.isDirectory()) return null;
      const md = join(realPath, "SKILL.md");
      skillMdExists = await exists(md);
      try {
        fileMtime = (await stat(skillMdExists ? md : realPath)).mtimeMs;
      } catch {
        fileMtime = null;
      }
    }
  } catch {
    return null;
  }

  return {
    entryPath,
    realPath,
    isSymlink,
    isBroken,
    skillMdExists,
    surface,
    source,
    fileMtime,
    ...extra,
  };
}

async function scanDir(
  dir: string,
  surface: Surface,
  source: SourceType,
  extra: Partial<RawSkillEntry>,
): Promise<RawSkillEntry[]> {
  const out: RawSkillEntry[] = [];
  for (const name of await listDirs(dir)) {
    const e = await inspectEntry(join(dir, name), surface, source, extra);
    // Keep dirs that look like skills (have SKILL.md) or are broken symlinks worth flagging.
    if (e && (e.skillMdExists || e.isBroken)) out.push(e);
  }
  return out;
}

async function scanAgent(home: string, agent: Surface): Promise<RawSkillEntry[]> {
  const root = join(home, agent === "claude" ? ".claude" : ".codex");
  const out: RawSkillEntry[] = [];

  out.push(...(await scanDir(join(root, "skills"), agent, `${agent}-user` as SourceType, {})));

  const mpRoot = join(root, "plugins/marketplaces");
  for (const mp of await listDirs(mpRoot)) {
    out.push(
      ...(await scanDir(join(mpRoot, mp, "skills"), agent, `${agent}-plugin-marketplace` as SourceType, {
        marketplace: mp,
      })),
    );
    const plugRoot = join(mpRoot, mp, "plugins");
    for (const pl of await listDirs(plugRoot)) {
      out.push(
        ...(await scanDir(join(plugRoot, pl, "skills"), agent, `${agent}-plugin-nested` as SourceType, {
          marketplace: mp,
          pluginName: pl,
        })),
      );
    }
  }

  const cacheRoot = join(root, "plugins/cache");
  for (const mp of await listDirs(cacheRoot)) {
    for (const ver of await listDirs(join(cacheRoot, mp))) {
      out.push(
        ...(await scanDir(join(cacheRoot, mp, ver, "skills"), agent, `${agent}-plugin-cache` as SourceType, {
          marketplace: mp,
          pluginVersion: ver,
        })),
      );
    }
  }

  return out;
}

export async function scanSkills(home: string): Promise<RawSkillEntry[]> {
  const claude = await scanAgent(home, "claude");
  const codex = await scanAgent(home, "codex");
  return [...claude, ...codex];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/scanner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanner.ts test/scanner.test.ts
git commit -m "feat: add filesystem scanner for claude+codex skill dirs"
```

---

## Task 5: Aggregate for inventory (`lib/aggregate.ts`)

**Files:**
- Create: `src/lib/aggregate.ts`
- Test: `test/aggregate.test.ts`

Aggregation rules (from spec §5): merge same `realPath` across surfaces; keep same-name/different-path separate; collapse cache versions to latest; drop a cache entry when a non-cache entry of the same `name` exists.

- [ ] **Step 1: Write the failing test**

```ts
// test/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregateSkills } from "../src/lib/aggregate";
import type { ParsedSkill } from "../src/lib/types";

function skill(over: Partial<ParsedSkill>): ParsedSkill {
  return {
    id: Math.random().toString(36).slice(2),
    name: "x",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: "/e",
    realPath: "/r",
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: 0,
    triggerHints: [],
    keywords: [],
    ...over,
  };
}

describe("aggregateSkills", () => {
  it("merges identical realPath across surfaces into one row with both surfaces", () => {
    const out = aggregateSkills([
      skill({ name: "firecrawl", realPath: "/repo/firecrawl", surface: "claude" }),
      skill({ name: "firecrawl", realPath: "/repo/firecrawl", surface: "codex" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].surfaces.sort()).toEqual(["claude", "codex"]);
  });

  it("keeps same name but different realPath as separate rows", () => {
    const out = aggregateSkills([
      skill({ name: "dup", realPath: "/a" }),
      skill({ name: "dup", realPath: "/b" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("collapses cache versions to the latest", () => {
    const out = aggregateSkills([
      skill({ name: "tighten", realPath: "/c/1.0", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "1.0.0" }),
      skill({ name: "tighten", realPath: "/c/2.0", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "2.0.0" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].primary.pluginVersion).toBe("2.0.0");
  });

  it("drops cache entry when a non-cache entry of same name exists", () => {
    const out = aggregateSkills([
      skill({ name: "brainstorming", realPath: "/mp", source: "claude-plugin-marketplace", marketplace: "sp" }),
      skill({ name: "brainstorming", realPath: "/cache", source: "claude-plugin-cache", marketplace: "sp", pluginVersion: "5.0.0" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("claude-plugin-marketplace");
  });

  it("sorts by name", () => {
    const out = aggregateSkills([skill({ name: "zeta", realPath: "/z" }), skill({ name: "alpha", realPath: "/a" })]);
    expect(out.map((s) => s.name)).toEqual(["alpha", "zeta"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/aggregate.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/aggregate'".

- [ ] **Step 3: Write `src/lib/aggregate.ts`**

```ts
import type { DisplaySkill, ParsedSkill, Surface } from "./types";

function isCache(s: ParsedSkill): boolean {
  return s.source === "claude-plugin-cache" || s.source === "codex-plugin-cache";
}

export function aggregateSkills(skills: ParsedSkill[]): DisplaySkill[] {
  // 1. Collapse cache versions to latest per (marketplace, name).
  const latestCache = new Map<string, ParsedSkill>();
  const nonCache: ParsedSkill[] = [];
  for (const s of skills) {
    if (isCache(s)) {
      const key = `${s.marketplace ?? ""}:${s.name}`;
      const prev = latestCache.get(key);
      if (!prev || (s.pluginVersion ?? "").localeCompare(prev.pluginVersion ?? "") > 0) {
        latestCache.set(key, s);
      }
    } else {
      nonCache.push(s);
    }
  }

  // 2. Drop a cache entry when a non-cache entry of the same name exists.
  const nonCacheNames = new Set(nonCache.map((s) => s.name));
  const keptCache = [...latestCache.values()].filter((s) => !nonCacheNames.has(s.name));
  const kept = [...nonCache, ...keptCache];

  // 3. Group by realPath; merge surfaces.
  const byPath = new Map<string, DisplaySkill>();
  for (const s of kept) {
    const existing = byPath.get(s.realPath);
    if (existing) {
      if (!existing.surfaces.includes(s.surface)) existing.surfaces.push(s.surface);
      continue;
    }
    byPath.set(s.realPath, {
      key: s.realPath,
      name: s.name,
      description: s.description,
      surfaces: [s.surface] as Surface[],
      source: s.source,
      marketplace: s.marketplace,
      pluginName: s.pluginName,
      keywords: dedupKeywords(s),
      primary: s,
    });
  }

  return [...byPath.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupKeywords(s: ParsedSkill): string[] {
  const extra = [...s.triggerHints, s.marketplace ?? "", s.name].filter(Boolean);
  return [...new Set([...s.keywords, ...extra.map((k) => k.toLowerCase())])];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/aggregate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/aggregate.ts test/aggregate.test.ts
git commit -m "feat: add inventory aggregation (surface merge, cache collapse)"
```

---

## Task 6: Health checks (`lib/health.ts`)

**Files:**
- Create: `src/lib/health.ts`
- Test: `test/health.test.ts`

H4 refinement (beyond the spec's literal wording, to avoid noise): cross-surface checks apply **only to `*-user` sources** (plugin skills are legitimately per-agent). "Missing on the other surface" only fires when the user actually uses both surfaces (each has ≥1 user skill).

- [ ] **Step 1: Write the failing test**

```ts
// test/health.test.ts
import { describe, it, expect } from "vitest";
import { computeHealth } from "../src/lib/health";
import type { ParsedSkill } from "../src/lib/types";

function skill(over: Partial<ParsedSkill>): ParsedSkill {
  return {
    id: Math.random().toString(36).slice(2),
    name: "x",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: "/e",
    realPath: "/r/x",
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: { name: "x" },
    body: "",
    fileMtime: 0,
    triggerHints: [],
    keywords: [],
    ...over,
  };
}
const HOME = "/home/u";

describe("computeHealth", () => {
  it("H1: flags broken symlink", () => {
    const issues = computeHealth([skill({ name: "ghost", isSymlink: true, isBroken: true })], HOME);
    expect(issues.find((i) => i.check === "H1")?.severity).toBe("error");
  });

  it("H2: flags missing SKILL.md", () => {
    const issues = computeHealth([skill({ name: "nomd", skillMdExists: false })], HOME);
    expect(issues.find((i) => i.check === "H2")).toBeDefined();
  });

  it("H2: flags parse error", () => {
    const issues = computeHealth([skill({ name: "bad", parseError: "yaml error: boom" })], HOME);
    expect(issues.find((i) => i.check === "H2")?.message).toMatch(/unparseable/i);
  });

  it("H3: flags name != directory", () => {
    const issues = computeHealth(
      [skill({ name: "aliyun-model-studio-cli", realPath: "/r/bailian-cli", frontmatter: { name: "aliyun-model-studio-cli" } })],
      HOME,
    );
    const h3 = issues.find((i) => i.check === "H3");
    expect(h3?.meta.expectedName).toBe("aliyun-model-studio-cli");
    expect(h3?.meta.currentDir).toBe("bailian-cli");
  });

  it("H4: flags skill present only in Claude when Codex is in use", () => {
    const issues = computeHealth(
      [
        skill({ name: "onlyclaude", surface: "claude", source: "claude-user", realPath: "/r/onlyclaude" }),
        skill({ name: "shared", surface: "codex", source: "codex-user", realPath: "/r/shared" }),
      ],
      HOME,
    );
    const h4 = issues.find((i) => i.check === "H4" && i.skillName === "onlyclaude");
    expect(h4?.meta.targetSurface).toBe("codex");
    expect(h4?.meta.targetDir).toBe("/home/u/.codex/skills/onlyclaude");
  });

  it("H4: does not flag plugin skills for single-surface", () => {
    const issues = computeHealth(
      [skill({ name: "p", source: "claude-plugin-marketplace", realPath: "/r/p" })],
      HOME,
    );
    expect(issues.find((i) => i.check === "H4")).toBeUndefined();
  });

  it("H5: flags stale cache versions", () => {
    const issues = computeHealth(
      [
        skill({ name: "t", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "1.0.0", realPath: "/c/1" }),
        skill({ name: "t", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "2.0.0", realPath: "/c/2" }),
      ],
      HOME,
    );
    const h5 = issues.find((i) => i.check === "H5");
    expect(h5?.severity).toBe("info");
    expect(h5?.affectedPaths).toContain("/c/1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/health.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/health'".

- [ ] **Step 3: Write `src/lib/health.ts`**

```ts
import { basename, join } from "node:path";
import type { HealthIssue, ParsedSkill, Surface } from "./types";

const USER_SOURCES = new Set<string>(["claude-user", "codex-user"]);

function surfaceDir(home: string, surface: Surface, name: string): string {
  const root = surface === "claude" ? ".claude" : ".codex";
  return join(home, root, "skills", name);
}

function perSkillIssues(s: ParsedSkill): HealthIssue[] {
  // H1: broken symlink
  if (s.isSymlink && s.isBroken) {
    return [
      {
        id: `H1:${s.id}`,
        check: "H1",
        severity: "error",
        skillName: s.name,
        message: "Broken symlink → target missing",
        affectedPaths: [s.entryPath],
        meta: { entryPath: s.entryPath },
      },
    ];
  }
  // H2: missing SKILL.md
  if (!s.skillMdExists) {
    return [
      {
        id: `H2:${s.id}`,
        check: "H2",
        severity: "error",
        skillName: s.name,
        message: "SKILL.md missing",
        affectedPaths: [s.realPath],
        meta: { realPath: s.realPath },
      },
    ];
  }
  const out: HealthIssue[] = [];
  // H2: unparseable
  if (s.parseError) {
    out.push({
      id: `H2:${s.id}`,
      check: "H2",
      severity: "error",
      skillName: s.name,
      message: `SKILL.md unparseable: ${s.parseError}`,
      affectedPaths: [s.realPath],
      meta: { realPath: s.realPath },
    });
  }
  // H3: name != dir
  const fmName = typeof s.frontmatter.name === "string" ? s.frontmatter.name.trim() : "";
  const dir = basename(s.realPath);
  if (fmName && fmName !== dir) {
    out.push({
      id: `H3:${s.id}`,
      check: "H3",
      severity: "warning",
      skillName: s.name,
      message: `frontmatter.name '${fmName}' ≠ directory '${dir}'`,
      affectedPaths: [s.realPath],
      meta: { realPath: s.realPath, expectedName: fmName, currentDir: dir },
    });
  }
  return out;
}

function crossSurfaceDrift(userSkills: ParsedSkill[], home: string): HealthIssue[] {
  const hasClaude = userSkills.some((s) => s.surface === "claude");
  const hasCodex = userSkills.some((s) => s.surface === "codex");
  const byName = new Map<string, ParsedSkill[]>();
  for (const s of userSkills) {
    const arr = byName.get(s.name) ?? [];
    arr.push(s);
    byName.set(s.name, arr);
  }
  const out: HealthIssue[] = [];
  for (const [name, list] of byName) {
    const clPaths = new Set(list.filter((s) => s.surface === "claude").map((s) => s.realPath));
    const cxPaths = new Set(list.filter((s) => s.surface === "codex").map((s) => s.realPath));
    if (clPaths.size && cxPaths.size) {
      const same = [...clPaths].every((p) => cxPaths.has(p)) && [...cxPaths].every((p) => clPaths.has(p));
      if (!same) {
        out.push({
          id: `H4d:${name}`,
          check: "H4",
          severity: "warning",
          skillName: name,
          message: "Claude/Codex point to different sources",
          affectedPaths: [...clPaths, ...cxPaths],
          meta: { claudePath: [...clPaths][0] ?? "", codexPath: [...cxPaths][0] ?? "" },
        });
      }
    } else if (clPaths.size && !cxPaths.size && hasCodex) {
      out.push({
        id: `H4m:${name}`,
        check: "H4",
        severity: "warning",
        skillName: name,
        message: "Only in Claude, missing in Codex",
        affectedPaths: [...clPaths],
        meta: { realPath: [...clPaths][0] ?? "", targetSurface: "codex", targetDir: surfaceDir(home, "codex", name) },
      });
    } else if (cxPaths.size && !clPaths.size && hasClaude) {
      out.push({
        id: `H4m:${name}`,
        check: "H4",
        severity: "warning",
        skillName: name,
        message: "Only in Codex, missing in Claude",
        affectedPaths: [...cxPaths],
        meta: { realPath: [...cxPaths][0] ?? "", targetSurface: "claude", targetDir: surfaceDir(home, "claude", name) },
      });
    }
  }
  return out;
}

function staleCache(skills: ParsedSkill[]): HealthIssue[] {
  const cacheSkills = skills.filter((s) => s.source === "claude-plugin-cache" || s.source === "codex-plugin-cache");
  const byKey = new Map<string, ParsedSkill[]>();
  for (const s of cacheSkills) {
    const k = `${s.marketplace ?? ""}:${s.name}`;
    const arr = byKey.get(k) ?? [];
    arr.push(s);
    byKey.set(k, arr);
  }
  const out: HealthIssue[] = [];
  for (const [key, list] of byKey) {
    if (list.length > 1) {
      const sorted = [...list].sort((a, b) => (b.pluginVersion ?? "").localeCompare(a.pluginVersion ?? ""));
      const old = sorted.slice(1);
      out.push({
        id: `H5:${key}`,
        check: "H5",
        severity: "info",
        skillName: sorted[0].name,
        message: `Stale cache: ${old.length} old version(s)`,
        affectedPaths: old.map((s) => s.realPath),
        meta: { paths: old.map((s) => s.realPath).join("\n") },
      });
    }
  }
  return out;
}

export function computeHealth(skills: ParsedSkill[], home: string): HealthIssue[] {
  const issues: HealthIssue[] = [];
  for (const s of skills) issues.push(...perSkillIssues(s));
  const userSkills = skills.filter((s) => USER_SOURCES.has(s.source) && !s.isBroken);
  issues.push(...crossSurfaceDrift(userSkills, home));
  issues.push(...staleCache(skills));
  return issues;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/health.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/health.ts test/health.test.ts
git commit -m "feat: add health checks H1-H5 with cross-surface drift"
```

---

## Task 7: Fix commands (`lib/fix-commands.ts`)

**Files:**
- Create: `src/lib/fix-commands.ts`
- Test: `test/fix-commands.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/fix-commands.test.ts
import { describe, it, expect } from "vitest";
import { buildFixCommand } from "../src/lib/fix-commands";
import type { HealthIssue } from "../src/lib/types";

function issue(over: Partial<HealthIssue>): HealthIssue {
  return {
    id: "i",
    check: "H1",
    severity: "error",
    skillName: "x",
    message: "",
    affectedPaths: [],
    meta: {},
    ...over,
  };
}

describe("buildFixCommand", () => {
  it("H1 → rm of the broken symlink", () => {
    const cmd = buildFixCommand(issue({ check: "H1", meta: { entryPath: "/h/.claude/skills/ghost" } }));
    expect(cmd).toContain('rm "/h/.claude/skills/ghost"');
  });

  it("H3 → both rename options", () => {
    const cmd = buildFixCommand(
      issue({ check: "H3", meta: { realPath: "/r/bailian-cli", expectedName: "aliyun-model-studio-cli", currentDir: "bailian-cli" } }),
    );
    expect(cmd).toContain('mv "/r/bailian-cli" "/r/aliyun-model-studio-cli"');
    expect(cmd).toMatch(/Option B/);
  });

  it("H4 missing → ln -s into target surface dir", () => {
    const cmd = buildFixCommand(
      issue({ check: "H4", meta: { realPath: "/repo/firecrawl", targetSurface: "codex", targetDir: "/h/.codex/skills/firecrawl" } }),
    );
    expect(cmd).toBe('ln -s "/repo/firecrawl" "/h/.codex/skills/firecrawl"');
  });

  it("H4 diverged → diff", () => {
    const cmd = buildFixCommand(issue({ check: "H4", meta: { claudePath: "/a", codexPath: "/b" } }));
    expect(cmd).toContain('diff -r "/a" "/b"');
  });

  it("H5 → rm -rf each stale path", () => {
    const cmd = buildFixCommand(issue({ check: "H5", severity: "info", meta: { paths: "/c/1\n/c/2" } }));
    expect(cmd).toContain('rm -rf "/c/1"');
    expect(cmd).toContain('rm -rf "/c/2"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fix-commands.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/fix-commands'".

- [ ] **Step 3: Write `src/lib/fix-commands.ts`**

```ts
import type { HealthIssue } from "./types";

export function buildFixCommand(issue: HealthIssue): string {
  switch (issue.check) {
    case "H1":
      return `# target missing, re-link or remove:\nrm "${issue.meta.entryPath}"`;

    case "H2":
      return `# SKILL.md missing or unparseable — inspect:\nls -la "${issue.meta.realPath}"`;

    case "H3": {
      const dirPath = issue.meta.realPath;
      const expected = issue.meta.expectedName;
      const cur = issue.meta.currentDir;
      const parent = dirPath.slice(0, dirPath.length - cur.length);
      return [
        "# Option A — rename dir to match frontmatter.name:",
        `mv "${dirPath}" "${parent}${expected}"`,
        `# Option B — instead edit frontmatter.name to '${cur}' in SKILL.md.`,
      ].join("\n");
    }

    case "H4":
      if (issue.meta.targetDir) {
        return `ln -s "${issue.meta.realPath}" "${issue.meta.targetDir}"`;
      }
      return `# diverged, inspect both:\ndiff -r "${issue.meta.claudePath}" "${issue.meta.codexPath}"`;

    case "H5":
      return (
        "# old versions (safe to remove if unused):\n" +
        issue.meta.paths
          .split("\n")
          .map((p) => `rm -rf "${p}"`)
          .join("\n")
      );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fix-commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fix-commands.ts test/fix-commands.test.ts
git commit -m "feat: add clipboard fix-command generation per health issue"
```

---

## Task 8: Reconcile / mtime-incremental index (`lib/reconcile.ts`)

**Files:**
- Create: `src/lib/reconcile.ts`
- Test: `test/reconcile.test.ts`

Pure async function: given freshly scanned entries + the cached index + an async `parse` fn, reuse cached skills whose `fileMtime` is unchanged and only call `parse` for new/changed/broken entries.

- [ ] **Step 1: Write the failing test**

```ts
// test/reconcile.test.ts
import { describe, it, expect, vi } from "vitest";
import { reconcileIndex } from "../src/lib/reconcile";
import { skillId } from "../src/lib/parser";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "../src/lib/types";

function entry(realPath: string, mtime: number | null, over: Partial<RawSkillEntry> = {}): RawSkillEntry {
  return {
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    surface: "claude",
    source: "claude-user",
    fileMtime: mtime,
    ...over,
  };
}

function cachedSkill(realPath: string, mtime: number): ParsedSkill {
  return {
    id: skillId(realPath),
    name: "cached",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: mtime,
    triggerHints: [],
    keywords: [],
  };
}

describe("reconcileIndex", () => {
  it("reuses cached skill when mtime unchanged, parses only changed", async () => {
    const cached: SkillIndex = {
      scannedAt: 1,
      skills: [cachedSkill("/a", 100), cachedSkill("/b", 200)],
    };
    const parse = vi.fn(async (e: RawSkillEntry) => ({ ...cachedSkill(e.realPath, e.fileMtime ?? 0), name: "fresh" }));

    const out = await reconcileIndex({
      scanned: [entry("/a", 100), entry("/b", 999)], // /a unchanged, /b changed
      cached,
      parse,
    });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ realPath: "/b" }));
    expect(out.skills.find((s) => s.realPath === "/a")?.name).toBe("cached");
    expect(out.skills.find((s) => s.realPath === "/b")?.name).toBe("fresh");
  });

  it("parses everything when cache is null", async () => {
    const parse = vi.fn(async (e: RawSkillEntry) => cachedSkill(e.realPath, 0));
    const out = await reconcileIndex({ scanned: [entry("/a", 1), entry("/b", 2)], cached: null, parse });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(out.skills).toHaveLength(2);
  });

  it("always re-parses broken entries even if mtime matches", async () => {
    const cached: SkillIndex = { scannedAt: 1, skills: [cachedSkill("/a", 100)] };
    const parse = vi.fn(async (e: RawSkillEntry) => cachedSkill(e.realPath, 0));
    await reconcileIndex({ scanned: [entry("/a", 100, { isBroken: true })], cached, parse });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/reconcile.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/reconcile'".

- [ ] **Step 3: Write `src/lib/reconcile.ts`**

```ts
import { skillId } from "./parser";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "./types";

export async function reconcileIndex(args: {
  scanned: RawSkillEntry[];
  cached: SkillIndex | null;
  parse: (entry: RawSkillEntry) => Promise<ParsedSkill>;
}): Promise<SkillIndex> {
  const cachedById = new Map((args.cached?.skills ?? []).map((s) => [s.id, s]));
  const skills: ParsedSkill[] = [];

  for (const e of args.scanned) {
    const id = skillId(e.realPath);
    const prev = cachedById.get(id);
    const unchanged = prev && e.fileMtime !== null && prev.fileMtime === e.fileMtime && !e.isBroken;
    if (unchanged) {
      skills.push(prev);
    } else {
      skills.push(await args.parse(e));
    }
  }

  return { scannedAt: Date.now(), skills };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/reconcile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reconcile.ts test/reconcile.test.ts
git commit -m "feat: add mtime-incremental index reconciliation"
```

---

## Task 9: Cache + actions (Raycast-coupled glue)

**Files:**
- Create: `src/lib/cache.ts`, `src/lib/actions.ts`

These import `@raycast/api`, so they are excluded from vitest coverage and verified manually in Task 12. Keep them thin.

- [ ] **Step 1: Write `src/lib/cache.ts`**

```ts
import { Cache } from "@raycast/api";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanSkills } from "./scanner";
import { parseEntry } from "./parser";
import { reconcileIndex } from "./reconcile";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "./types";

const cache = new Cache();
const KEY = "skills-index-v1";

export function readCachedIndex(): SkillIndex | null {
  const raw = cache.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SkillIndex;
  } catch {
    return null;
  }
}

export function writeIndex(index: SkillIndex): void {
  cache.set(KEY, JSON.stringify(index));
}

async function parseWithFile(entry: RawSkillEntry): Promise<ParsedSkill> {
  let rawMd: string | null = null;
  if (entry.skillMdExists && !entry.isBroken) {
    rawMd = await readFile(join(entry.realPath, "SKILL.md"), "utf8").catch(() => null);
  }
  return parseEntry(entry, rawMd);
}

export async function getIndex(opts?: { force?: boolean; home?: string }): Promise<SkillIndex> {
  const home = opts?.home ?? homedir();
  const scanned = await scanSkills(home);
  const cached = opts?.force ? null : readCachedIndex();
  const index = await reconcileIndex({ scanned, cached, parse: parseWithFile });
  writeIndex(index);
  return index;
}
```

- [ ] **Step 2: Write `src/lib/actions.ts`**

```ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Clipboard, open, showToast, Toast } from "@raycast/api";

const pexec = promisify(exec);

export async function copyToClipboard(text: string, title = "Copied"): Promise<void> {
  await Clipboard.copy(text);
  await showToast({ style: Toast.Style.Success, title });
}

export async function openInEditor(filePath: string): Promise<void> {
  for (const bin of ["cursor", "code"]) {
    try {
      await pexec(`command -v ${bin}`);
      await pexec(`${bin} "${filePath}"`);
      return;
    } catch {
      // try next editor
    }
  }
  try {
    await open(filePath);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Could not open editor" });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cache.ts src/lib/actions.ts
git commit -m "feat: add Raycast cache orchestrator and editor/clipboard actions"
```

---

## Task 10: Inventory command (`search-skills.tsx` + `SkillDetail.tsx`)

**Files:**
- Create: `src/components/SkillDetail.tsx`, `src/search-skills.tsx`

UI is verified manually via `ray develop` (Step 4), not unit-tested.

- [ ] **Step 1: Write `src/components/SkillDetail.tsx`**

```tsx
import { List } from "@raycast/api";
import type { DisplaySkill, HealthIssue } from "../lib/types";

function sourceLabel(s: DisplaySkill): string {
  if (s.source.includes("plugin")) return `${s.marketplace ?? "plugin"}${s.pluginName ? `/${s.pluginName}` : ""}`;
  return "user";
}

export function SkillDetail({ skill, issues }: { skill: DisplaySkill; issues: HealthIssue[] }) {
  const md = `# ${skill.name}\n\n${skill.description || "_No description_"}\n\n---\n\n${
    skill.primary.body || "_No body_"
  }`;
  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Source" text={sourceLabel(skill)} />
          <List.Item.Detail.Metadata.Label title="Path" text={skill.primary.realPath} />
          <List.Item.Detail.Metadata.TagList title="Surfaces">
            {skill.surfaces.map((s) => (
              <List.Item.Detail.Metadata.TagList.Item key={s} text={s} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          {skill.primary.triggerHints.length > 0 && (
            <List.Item.Detail.Metadata.Label title="Triggers" text={skill.primary.triggerHints.join(", ")} />
          )}
          {issues.length > 0 && (
            <List.Item.Detail.Metadata.Label title="Health" text={`${issues.length} issue(s)`} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
```

- [ ] **Step 2: Write `src/search-skills.tsx`**

```tsx
import { useEffect, useState } from "react";
import { homedir } from "node:os";
import { join } from "node:path";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getIndex } from "./lib/cache";
import { aggregateSkills } from "./lib/aggregate";
import { computeHealth } from "./lib/health";
import { buildFixCommand } from "./lib/fix-commands";
import { copyToClipboard, openInEditor } from "./lib/actions";
import { SkillDetail } from "./components/SkillDetail";
import type { DisplaySkill, HealthIssue } from "./lib/types";

function iconFor(s: DisplaySkill) {
  return s.source.includes("plugin")
    ? { source: Icon.Plug, tintColor: Color.Purple }
    : { source: Icon.Box, tintColor: Color.Blue };
}

function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.。!?]/);
  return stop > 0 ? t.slice(0, stop + 1) : t.slice(0, 80);
}

function slashCommand(s: DisplaySkill): string {
  if (s.source.includes("plugin") && s.marketplace) return `/${s.marketplace}:${s.name}`;
  return `/${s.name}`;
}

function sectionTitle(s: DisplaySkill): string {
  if (s.source.includes("plugin")) return `Plugins · ${s.marketplace ?? "unknown"}`;
  return "User · Claude + Codex";
}

function accessoriesFor(s: DisplaySkill, issues: HealthIssue[]): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = s.surfaces.map((surf) => ({ tag: surf }));
  const hasError = issues.some((i) => i.severity === "error");
  if (issues.length > 0) {
    acc.push({
      icon: hasError
        ? { source: Icon.XMarkCircle, tintColor: Color.Red }
        : { source: Icon.Warning, tintColor: Color.Yellow },
      tooltip: `${issues.length} health issue(s)`,
    });
  }
  return acc;
}

export default function Command() {
  const [isLoading, setLoading] = useState(true);
  const [items, setItems] = useState<DisplaySkill[]>([]);
  const [issuesByName, setIssuesByName] = useState<Map<string, HealthIssue[]>>(new Map());
  const [showingDetail, setShowingDetail] = useState(false);

  async function load(force = false) {
    setLoading(true);
    try {
      const index = await getIndex({ force });
      setItems(aggregateSkills(index.skills));
      const issues = computeHealth(index.skills, homedir());
      const map = new Map<string, HealthIssue[]>();
      for (const i of issues) {
        const arr = map.get(i.skillName) ?? [];
        arr.push(i);
        map.set(i.skillName, arr);
      }
      setIssuesByName(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sections = new Map<string, DisplaySkill[]>();
  for (const s of items) {
    const t = sectionTitle(s);
    const arr = sections.get(t) ?? [];
    arr.push(s);
    sections.set(t, arr);
  }
  const orderedSections = [...sections.entries()].sort((a, b) =>
    a[0].startsWith("User") ? -1 : b[0].startsWith("User") ? 1 : a[0].localeCompare(b[0]),
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search skills by name, purpose, trigger…"
    >
      {orderedSections.map(([title, group]) => (
        <List.Section key={title} title={title}>
          {group.map((s) => {
            const issues = issuesByName.get(s.name) ?? [];
            return (
              <List.Item
                key={s.key}
                icon={iconFor(s)}
                title={s.name}
                subtitle={showingDetail ? undefined : firstSentence(s.description)}
                keywords={s.keywords}
                accessories={accessoriesFor(s, issues)}
                detail={<SkillDetail skill={s} issues={issues} />}
                actions={
                  <ActionPanel>
                    <Action title="Copy Skill Name" icon={Icon.Clipboard} onAction={() => copyToClipboard(s.name)} />
                    <Action
                      title="Copy as /command"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => copyToClipboard(slashCommand(s))}
                    />
                    <Action
                      title="Copy Trigger Phrase"
                      icon={Icon.Text}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      onAction={() => copyToClipboard(s.primary.triggerHints[0] ?? s.name)}
                    />
                    <Action
                      title="Toggle Detail"
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail((v) => !v)}
                    />
                    <Action
                      title="Open in Editor"
                      icon={Icon.Code}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={() => openInEditor(join(s.primary.realPath, "SKILL.md"))}
                    />
                    <Action.ShowInFinder path={s.primary.realPath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                    {issues.length > 0 && (
                      <Action
                        title="Copy Fix Command"
                        icon={Icon.Wrench}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                        onAction={() => copyToClipboard(buildFixCommand(issues[0]), "Fix command copied")}
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => load(true)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Then in Raycast: open "Search Skills". Verify:
- Skills appear grouped (User section first, then Plugins by marketplace).
- Typing `scrape` / a Chinese purpose word filters to the right skill.
- `⌘D` toggles the SKILL.md detail panel.
- `⏎` copies the name (toast shows "Copied").
- A skill with a known issue shows a ⚠️/🔴 accessory and exposes "Copy Fix Command".
Stop dev with Ctrl-C when done.

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillDetail.tsx src/search-skills.tsx
git commit -m "feat: add Search Skills inventory command"
```

---

## Task 11: Doctor command (`skill-doctor.tsx` + `IssueListItem.tsx`)

**Files:**
- Create: `src/components/IssueListItem.tsx`, `src/skill-doctor.tsx`

- [ ] **Step 1: Write `src/components/IssueListItem.tsx`**

```tsx
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { buildFixCommand } from "../lib/fix-commands";
import { copyToClipboard, openInEditor } from "../lib/actions";
import { join } from "node:path";
import type { HealthIssue } from "../lib/types";

function iconFor(sev: HealthIssue["severity"]) {
  if (sev === "error") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (sev === "warning") return { source: Icon.Warning, tintColor: Color.Yellow };
  return { source: Icon.Info, tintColor: Color.SecondaryText };
}

export function IssueListItem({ issue }: { issue: HealthIssue }) {
  const primaryPath = issue.affectedPaths[0];
  return (
    <List.Item
      icon={iconFor(issue.severity)}
      title={issue.skillName}
      subtitle={issue.message}
      accessories={[{ tag: issue.check }]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Fix Command"
            icon={Icon.Wrench}
            onAction={() => copyToClipboard(buildFixCommand(issue), "Fix command copied")}
          />
          {primaryPath && (
            <Action
              title="Open in Editor"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => openInEditor(join(primaryPath, "SKILL.md"))}
            />
          )}
          {primaryPath && <Action.ShowInFinder path={primaryPath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />}
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Write `src/skill-doctor.tsx`**

```tsx
import { useEffect, useState } from "react";
import { homedir } from "node:os";
import { List } from "@raycast/api";
import { getIndex } from "./lib/cache";
import { computeHealth } from "./lib/health";
import { IssueListItem } from "./components/IssueListItem";
import type { HealthIssue, HealthSeverity } from "./lib/types";

const SECTIONS: { sev: HealthSeverity; title: string }[] = [
  { sev: "error", title: "Errors" },
  { sev: "warning", title: "Warnings" },
  { sev: "info", title: "Info" },
];

export default function Command() {
  const [isLoading, setLoading] = useState(true);
  const [issues, setIssues] = useState<HealthIssue[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const index = await getIndex();
        setIssues(computeHealth(index.skills, homedir()));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Filter ${issues.length} issue(s)…`}>
      {SECTIONS.map(({ sev, title }) => {
        const group = issues.filter((i) => i.severity === sev);
        if (group.length === 0) return null;
        return (
          <List.Section key={sev} title={`${title} (${group.length})`}>
            {group.map((issue) => (
              <IssueListItem key={issue.id} issue={issue} />
            ))}
          </List.Section>
        );
      })}
      {!isLoading && issues.length === 0 && (
        <List.EmptyView icon="🎉" title="No issues" description="All skills look healthy." />
      )}
    </List>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Then in Raycast: open "Skill Doctor". Verify:
- Issues grouped by Errors / Warnings / Info with counts.
- The known `bailian-cli` H3 case appears as a warning (if present on this machine).
- `⏎` on an issue copies a fix command (toast "Fix command copied").
- Empty state shows when there are no issues.
Stop dev with Ctrl-C when done.

- [ ] **Step 5: Commit**

```bash
git add src/components/IssueListItem.tsx src/skill-doctor.tsx
git commit -m "feat: add Skill Doctor health command"
```

---

## Task 12: Polish — full test run, lint, icon, README

**Files:**
- Create: `README.md`
- Replace: `assets/icon.png` (real 512×512)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all 6 test files pass.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: no errors. If autofixable issues appear, run `npm run fix-lint` and re-run `npm run lint`.

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Create `README.md`**

```markdown
# Skill Manager

A Raycast extension to browse and health-check the skills installed for
Claude Code and Codex.

## Commands

- **Search Skills** — fuzzy-search every installed skill by name, purpose, or
  trigger phrase; preview its `SKILL.md`; copy its name / `/command` / trigger;
  open it in your editor.
- **Skill Doctor** — list health issues (broken symlinks, missing/unparseable
  `SKILL.md`, name/directory mismatch, Claude↔Codex drift, stale plugin cache)
  and copy a suggested fix command to your clipboard.

This extension never writes to or deletes from the filesystem. All fixes are
copied to the clipboard for you to review and run in your own terminal.

## Development

```bash
npm install
npm run dev      # run in Raycast
npm test     # run unit tests
npm run lint     # lint
```
```

- [ ] **Step 5: Replace the placeholder icon**

Create a real 512×512 PNG at `assets/icon.png` (box/puzzle motif, Catppuccin
palette). If a designed asset is not ready, keep the placeholder — it does not
block `npm run dev`, only Store submission. Note this as the one remaining
pre-publish task.

- [ ] **Step 6: Final manual smoke test**

Run: `npm run dev`
Verify both commands open without errors on the real machine; confirm the
inventory count looks right (100+ skills) and Doctor surfaces the real
`bailian-cli` H3 case. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add README.md assets/icon.png
git commit -m "docs: add README and finalize v1 polish"
```

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| Standalone, no agent-skills dep | Whole plan (scanner reads fs directly) |
| Claude + Codex, plugin dirs | Task 4 (scanner) |
| Inventory launcher (U1) | Task 10 |
| Skill Doctor (health) | Task 11 |
| Health H1-H5 | Task 6 |
| Fix commands, copy-only (M2') | Task 7 + Tasks 10/11 (clipboard actions only) |
| Same-name aggregation rules | Task 5 |
| mtime-incremental cache | Tasks 8 (logic) + 9 (Cache wiring) |
| Preserve full frontmatter (v2 hook) | Task 2 (`frontmatter` field) + Task 3 (parser keeps it) |
| triggerHints extraction | Task 3 |
| Error handling per-skill | Tasks 3/4 (try/catch to per-skill granularity; parseError instead of throw) |
| Testing ~80% on lib/ | Tasks 3-8 (vitest); coverage config excludes cache/actions |
| Icon decisions | Task 10 (`iconFor`) + Task 12 (extension icon) |

No spec requirement is left without a task.

**2. Placeholder scan:** No "TBD/TODO/implement later" steps; every code step contains complete code; every command step states expected output. The only deferred item is the final designed icon (Task 12 Step 5), explicitly flagged as non-blocking pre-publish work — not a plan placeholder.

**3. Type consistency:** `skillId` defined in Task 3 (parser) and reused in Task 8 (reconcile) — consistent name and signature. `getIndex`, `computeHealth(skills, home)`, `buildFixCommand(issue)`, `aggregateSkills(skills)`, `reconcileIndex({scanned, cached, parse})` signatures are identical everywhere they appear (Tasks 9-11 call them exactly as defined in Tasks 5-8). `ParsedSkill`, `RawSkillEntry`, `DisplaySkill`, `HealthIssue`, `SkillIndex` field names used in tests and components match Task 2 definitions.

---

## Notes for the implementer

- `@raycast/api` version in `package.json` is a known-good floor; if `npm install` resolves a newer 1.x, that is fine.
- The cache versioned-dir layout (`plugins/cache/<mp>/<version>/skills`) is an assumption; the scanner tolerates absence, so if a machine's layout differs, those entries simply won't appear — verify against the real `~/.claude/plugins/cache` during Task 4 manual checks and adjust `scanAgent` if needed.
- If `ray lint` complains about the raw PNG placeholder, regenerate it or drop in any 512×512 PNG; it is cosmetic for dev.

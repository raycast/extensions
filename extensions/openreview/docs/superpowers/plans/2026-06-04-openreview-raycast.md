# OpenReview Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working, importable Raycast extension that lists the signed-in user's OpenReview submissions across all venues with their review scores and decision.

**Architecture:** A single `view` command renders a `List` of submissions; selecting one pushes a `Detail`. Pure modules handle auth (token cache), the OpenReview v2 REST client, and parsing/aggregation of notes+reviews. Parsing is dependency-free and unit-tested with fixtures; UI is thin.

**Tech Stack:** TypeScript + React, `@raycast/api`, `@raycast/utils`, `vitest` (tests), OpenReview API v2 REST via global `fetch`.

---

## File Structure

```
openreview-raycast/
  package.json              # Raycast manifest: command + preferences + scripts
  tsconfig.json
  vitest.config.ts
  .gitignore
  src/
    types.ts                # Submission, Review, Aggregate types
    lib/
      parse.ts              # pure: notes JSON -> Submission[] (TESTED)
      parse.test.ts
      openreview.ts         # REST client: login, fetch author notes
      auth.ts               # token cache via LocalStorage
    components/
      SubmissionDetail.tsx  # Detail view (Author-Console-style markdown)
    my-submissions.tsx      # List command entry
```

---

### Task 1: Project scaffold & toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`

- [ ] **Step 1: Write `package.json`** — Raycast manifest with one `view` command `my-submissions`, two preferences (`username` text, `password` password), scripts `build`/`dev`/`lint`/`test`, deps `@raycast/api` `@raycast/utils`, devDeps `typescript` `@types/react` `@types/node` `vitest` `@raycast/eslint-config` `eslint` `prettier`.
- [ ] **Step 2: Write `tsconfig.json`** — Raycast standard (`"jsx": "react-jsx"`, `"module": "commonjs"`/`esnext`, `"target": "es2021"`, `"strict": true`, `"isolatedModules": true`, include `src`).
- [ ] **Step 3: Write `vitest.config.ts`** — `environment: 'node'`, include `src/**/*.test.ts`.
- [ ] **Step 4: Write `.gitignore`** — `node_modules`, `.raycast`, `dist`, `*.log`.
- [ ] **Step 5: `npm install`** — Expected: installs without error.
- [ ] **Step 6: Commit** — `feat: scaffold raycast extension`.

---

### Task 2: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Define types** (no runtime code, no imports):

```ts
export interface Review {
  reviewer: string;          // "Reviewer jkfT"
  rating: number | null;     // Overall_recommendation / rating
  confidence: number | null;
  forumNoteUrl: string;      // link to the review note
}

export interface Aggregate {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface Submission {
  id: string;                // forum/note id
  number: number;            // 1042
  title: string;
  authors: string[];
  venue: string;             // "Submitted to ICML 2026"
  venueId: string;
  forumUrl: string;
  pdfUrl: string | null;
  reviews: Review[];
  ratingAgg: Aggregate | null;
  confidenceAgg: Aggregate | null;
  decision: string | null;   // "Reject" | "Accept ..." | null
}
```

- [ ] **Step 2: Commit** — `feat: add domain types`.

---

### Task 3: Parsing & aggregation (TDD core)

**Files:**
- Create: `src/lib/parse.ts`, `src/lib/parse.test.ts`

- [ ] **Step 1: Write failing tests** in `parse.test.ts`. Fixtures are a v2 note with `details.directReplies`. Cover: title/number/authors/venue extraction; ICML `Overall_recommendation` + `Confidence`; aggregates incl. min/max; decision from `/Decision/` reply; ICLR `rating` alias; missing-field → `null`/`N/A`; numeric parse from `"4: marginally above"`.

```ts
import { describe, it, expect } from "vitest";
import { parseSubmissions, parseLeadingNumber } from "./parse";

const icmlNote = {
  id: "f1", forum: "f1", number: 1042,
  content: {
    title: { value: "Sparse Attention Routing" },
    authors: { value: ["Ada Lovelace", "Alan Turing"] },
    venue: { value: "Submitted to ICML 2026" },
    venueid: { value: "ICML.cc/2026/Conference/Submission1042" },
    pdf: { value: "/pdf/abc.pdf" },
  },
  details: {
    directReplies: [
      { id: "r1", forum: "f1", invitations: ["ICML.cc/2026/Conference/Submission1042/-/Official_Review"],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_jkfT"],
        content: { Overall_recommendation: { value: 4 }, Confidence: { value: 3 } } },
      { id: "r2", forum: "f1", invitations: ["ICML.cc/2026/Conference/Submission1042/-/Official_Review"],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_NHfd"],
        content: { Overall_recommendation: { value: 5 }, Confidence: { value: 4 } } },
      { id: "r3", forum: "f1", invitations: ["ICML.cc/2026/Conference/Submission1042/-/Official_Review"],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_U8Pq"],
        content: { Overall_recommendation: { value: 3 }, Confidence: { value: 2 } } },
      { id: "d1", forum: "f1", invitations: ["ICML.cc/2026/Conference/Submission1042/-/Decision"],
        signatures: ["ICML.cc/2026/Conference/Program_Chairs"],
        content: { decision: { value: "Reject" } } },
    ],
  },
};

describe("parseLeadingNumber", () => {
  it("parses plain and prefixed", () => {
    expect(parseLeadingNumber(4)).toBe(4);
    expect(parseLeadingNumber("4: marginally above")).toBe(4);
    expect(parseLeadingNumber(undefined)).toBe(null);
  });
});

describe("parseSubmissions", () => {
  const [s] = parseSubmissions([icmlNote]);
  it("extracts summary", () => {
    expect(s.number).toBe(1042);
    expect(s.title).toMatch(/Sparse Attention/);
    expect(s.authors).toContain("Alan Turing");
    expect(s.venue).toBe("Submitted to ICML 2026");
    expect(s.pdfUrl).toContain("/pdf/abc.pdf");
    expect(s.forumUrl).toBe("https://openreview.net/forum?id=f1");
  });
  it("extracts reviews and aggregates", () => {
    expect(s.reviews).toHaveLength(3);
    expect(s.reviews[0].reviewer).toBe("Reviewer jkfT");
    expect(s.ratingAgg).toEqual({ avg: 4, min: 3, max: 5, count: 3 });
    expect(s.confidenceAgg).toEqual({ avg: 3, min: 2, max: 4, count: 3 });
  });
  it("extracts decision", () => { expect(s.decision).toBe("Reject"); });

  it("supports ICLR rating alias and missing fields", () => {
    const iclrNote = { id: "g1", forum: "g1", number: 1, content: { title: { value: "X" } },
      details: { directReplies: [
        { id: "x", forum: "g1", invitations: ["ICLR.cc/2026/Conference/Submission1/-/Official_Review"],
          signatures: ["ICLR.cc/2026/Conference/Submission1/Reviewer_ab12"],
          content: { rating: { value: "8: accept" } } } ] } };
    const [z] = parseSubmissions([iclrNote]);
    expect(z.reviews[0].rating).toBe(8);
    expect(z.reviews[0].confidence).toBe(null);
    expect(z.confidenceAgg).toBe(null);
    expect(z.decision).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests, verify fail** — `npx vitest run src/lib/parse.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement `parse.ts`:**

```ts
import { Submission, Review, Aggregate } from "../types";

const RATING_KEYS = ["overall_recommendation", "rating", "recommendation", "score"];
const CONFIDENCE_KEYS = ["confidence"];
const REVIEW_RE = /Official_Review/;
const DECISION_RE = /Decision/;
const META_RE = /Meta_Review/;

export function parseLeadingNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function val(content: any, key: string): unknown {
  const f = content?.[key];
  return f && typeof f === "object" && "value" in f ? f.value : f;
}

function findByKeys(content: any, keys: string[]): number | null {
  if (!content) return null;
  const lower: Record<string, string> = {};
  for (const k of Object.keys(content)) lower[k.toLowerCase()] = k;
  for (const want of keys) {
    if (lower[want]) {
      const n = parseLeadingNumber(val(content, lower[want]));
      if (n !== null) return n;
    }
  }
  return null;
}

function invsOf(note: any): string[] {
  if (Array.isArray(note.invitations)) return note.invitations;
  if (typeof note.invitation === "string") return [note.invitation];
  return [];
}

function reviewerLabel(note: any): string {
  const sig = (note.signatures ?? [])[0] ?? "";
  const m = sig.match(/Reviewer_([A-Za-z0-9]+)/);
  return m ? `Reviewer ${m[1]}` : "Reviewer";
}

function aggregate(nums: number[]): Aggregate | null {
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return { avg: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums), count: nums.length };
}

export function parseSubmissions(notes: any[]): Submission[] {
  return notes.map((note) => {
    const c = note.content ?? {};
    const replies: any[] = note.details?.directReplies ?? [];

    const reviewNotes = replies.filter((r) => invsOf(r).some((i) => REVIEW_RE.test(i)));
    const reviews: Review[] = reviewNotes.map((r) => ({
      reviewer: reviewerLabel(r),
      rating: findByKeys(r.content, RATING_KEYS),
      confidence: findByKeys(r.content, CONFIDENCE_KEYS),
      forumNoteUrl: `https://openreview.net/forum?id=${note.forum}&noteId=${r.id}`,
    }));

    const decisionNote =
      replies.find((r) => invsOf(r).some((i) => DECISION_RE.test(i))) ??
      replies.find((r) => invsOf(r).some((i) => META_RE.test(i)));
    let decision: string | null = null;
    if (decisionNote) {
      const d = val(decisionNote.content, "decision") ?? val(decisionNote.content, "recommendation");
      decision = typeof d === "string" ? d : d != null ? String(d) : null;
    }

    const pdf = val(c, "pdf");
    return {
      id: note.id,
      number: note.number ?? 0,
      title: String(val(c, "title") ?? "(untitled)"),
      authors: (val(c, "authors") as string[]) ?? [],
      venue: String(val(c, "venue") ?? ""),
      venueId: String(val(c, "venueid") ?? ""),
      forumUrl: `https://openreview.net/forum?id=${note.forum}`,
      pdfUrl: typeof pdf === "string" ? `https://openreview.net${pdf}` : null,
      reviews,
      ratingAgg: aggregate(reviews.map((r) => r.rating).filter((n): n is number => n !== null)),
      confidenceAgg: aggregate(reviews.map((r) => r.confidence).filter((n): n is number => n !== null)),
      decision,
    };
  });
}
```

- [ ] **Step 4: Run tests, verify pass** — `npx vitest run src/lib/parse.test.ts` → PASS.
- [ ] **Step 5: Commit** — `feat: add submission/review parsing with tests`.

---

### Task 4: Auth (token cache)

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Implement `auth.ts`:**

```ts
import { LocalStorage, getPreferenceValues } from "@raycast/api";

const BASE = "https://api2.openreview.net";
const KEY = "openreview-auth";
const WEEK = 7 * 24 * 3600 * 1000;

interface Prefs { username: string; password: string }
interface Cached { token: string; profileId: string; expiresAt: number }

async function login(): Promise<Cached> {
  const { username, password } = getPreferenceValues<Prefs>();
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: username, password, expiresIn: WEEK / 1000 }),
  });
  if (!res.ok) throw new Error(`OpenReview login failed (${res.status}). Check credentials in preferences.`);
  const data = (await res.json()) as { token: string; user: { id: string } };
  const cached: Cached = { token: data.token, profileId: data.user.id, expiresAt: Date.now() + WEEK - 60_000 };
  await LocalStorage.setItem(KEY, JSON.stringify(cached));
  return cached;
}

export async function getAuth(): Promise<Cached> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (raw) {
    const c = JSON.parse(raw) as Cached;
    if (c.expiresAt > Date.now()) return c;
  }
  return login();
}

export { BASE };
```

- [ ] **Step 2: Commit** — `feat: add openreview auth token cache`.

---

### Task 5: REST client

**Files:**
- Create: `src/lib/openreview.ts`

- [ ] **Step 1: Implement `openreview.ts`** (paginated author-notes fetch with replies):

```ts
import { getAuth, BASE } from "./auth";
import { parseSubmissions } from "./parse";
import { Submission } from "../types";

export async function fetchMySubmissions(): Promise<Submission[]> {
  const { token, profileId } = await getAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const limit = 100;
  let offset = 0;
  const notes: any[] = [];
  for (;;) {
    const url = `${BASE}/notes?content.authorids=${encodeURIComponent(profileId)}&details=directReplies&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to fetch submissions (${res.status}).`);
    const data = (await res.json()) as { notes: any[]; count: number };
    notes.push(...data.notes);
    offset += limit;
    if (notes.length >= data.count || data.notes.length === 0) break;
  }
  return parseSubmissions(notes).sort((a, b) => b.number - a.number);
}
```

- [ ] **Step 2: Commit** — `feat: add openreview rest client`.

---

### Task 6: Detail view

**Files:**
- Create: `src/components/SubmissionDetail.tsx`

- [ ] **Step 1: Implement `SubmissionDetail.tsx`** — Author-Console-style markdown + metadata + actions:

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { Submission, Aggregate } from "../types";

function aggLine(label: string, a: Aggregate | null): string {
  if (!a) return `**Average ${label}:** N/A`;
  return `**Average ${label}:** ${a.avg.toFixed(2)} (Min: ${a.min}, Max: ${a.max})`;
}

export function SubmissionDetail({ s }: { s: Submission }) {
  const reviewLines = s.reviews.length
    ? s.reviews
        .map((r) => `- **${r.reviewer}:** Recommendation: ${r.rating ?? "N/A"} / Confidence: ${r.confidence ?? "N/A"}  ([Read](${r.forumNoteUrl}))`)
        .join("\n")
    : "_No official reviews submitted yet._";

  const md = `# ${s.title}

\`#${s.number}\` · ${s.authors.join(", ")}

## ${s.reviews.length} Official Review${s.reviews.length === 1 ? "" : "s"} Submitted

${reviewLines}

${aggLine("Overall Recommendation", s.ratingAgg)}
${aggLine("Confidence", s.confidenceAgg)}

## Decision

${s.venue || "—"}${s.decision ? `\n\n**Recommendation:** ${s.decision}` : ""}
`;

  return (
    <Detail
      markdown={md}
      navigationTitle={`#${s.number}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Venue" text={s.venue || "—"} />
          <Detail.Metadata.Label title="Reviews" text={String(s.reviews.length)} />
          <Detail.Metadata.Label title="Avg Recommendation" text={s.ratingAgg ? s.ratingAgg.avg.toFixed(2) : "N/A"} />
          <Detail.Metadata.Label title="Decision" text={s.decision ?? "Pending"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Forum" url={s.forumUrl} />
          {s.pdfUrl ? <Action.OpenInBrowser title="Open PDF" url={s.pdfUrl} /> : null}
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Commit** — `feat: add submission detail view`.

---

### Task 7: List command

**Files:**
- Create: `src/my-submissions.tsx`

- [ ] **Step 1: Implement `my-submissions.tsx`:**

```tsx
import { List, ActionPanel, Action, Icon, Color, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchMySubmissions } from "./lib/openreview";
import { SubmissionDetail } from "./components/SubmissionDetail";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchMySubmissions, [], { keepPreviousData: true });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load submissions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter submissions by title…">
      {(data ?? []).map((s) => (
        <List.Item
          key={s.id}
          title={s.title}
          subtitle={`#${s.number}`}
          accessories={[
            { tag: s.ratingAgg ? { value: `★ ${s.ratingAgg.avg.toFixed(2)}`, color: Color.Yellow } : { value: "no reviews", color: Color.SecondaryText } },
            { text: `${s.reviews.length} rev` },
            { tag: s.decision ? { value: s.decision, color: /accept/i.test(s.decision) ? Color.Green : Color.Red } : { value: s.venue || "submitted", color: Color.Blue } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<SubmissionDetail s={s} />} />
              <Action.OpenInBrowser title="Open Forum" url={s.forumUrl} />
              {s.pdfUrl ? <Action.OpenInBrowser title="Open PDF" url={s.pdfUrl} /> : null}
              <Action title="Refresh" onAction={() => { revalidate(); showToast({ style: Toast.Style.Animated, title: "Refreshing…" }); }} />
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 2: Commit** — `feat: add my-submissions list command`.

---

### Task 8: Verify build & finalize

- [ ] **Step 1: Type-check** — `npx tsc --noEmit` → no errors.
- [ ] **Step 2: Run all tests** — `npx vitest run` → PASS.
- [ ] **Step 3: Raycast build** — `npx ray build -e dist` (or `npm run build`) → succeeds (bundles + validates manifest).
- [ ] **Step 4: Add `README.md`** with setup (Import Extension, set username/password in preferences) and assets note.
- [ ] **Step 5: Commit** — `chore: verify build + add README`.

---

## Self-Review

- **Spec coverage:** auth/preferences (T4), profile auto-detect + author notes fetch (T5), parse summary/reviews/aggregates/decision incl. per-venue field heuristic & N/A (T3), List accessories + Detail Author-Console layout (T6,T7), error→preferences fallback (T7), unit tests on pure logic (T3), build verification (T8). All spec sections mapped.
- **Placeholder scan:** none — every code step is complete.
- **Type consistency:** `Submission`/`Review`/`Aggregate` defined T2 and used identically in T3/T6/T7; `getAuth`/`BASE` exported T4 used T5; `fetchMySubmissions` T5 used T7; `parseSubmissions`/`parseLeadingNumber` T3 used in tests.
- **Risk:** live `content.authorids` query unverifiable without the user's credentials; client isolated so a fallback endpoint swap touches only T5.
```

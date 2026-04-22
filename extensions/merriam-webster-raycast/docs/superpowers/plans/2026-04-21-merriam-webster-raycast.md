# Merriam-Webster Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Raycast extension for Merriam-Webster's Learner's Dictionary with live search, exact lookup, inline suggestions, rich entry detail, and preference-based API key configuration.

**Architecture:** The extension uses two Raycast commands backed by a shared Learner API client, a normalization layer, and a Markdown formatter. Pure parsing and formatting logic is covered by unit tests, while command flows are validated through local Raycast development plus lint and build checks.

**Tech Stack:** TypeScript, React, Raycast API, Raycast Utils, Vitest

---

## File Structure

### Files to Create

- `/Users/zeeshan-dev/code/merriam-webster/package.json`
- `/Users/zeeshan-dev/code/merriam-webster/tsconfig.json`
- `/Users/zeeshan-dev/code/merriam-webster/vitest.config.ts`
- `/Users/zeeshan-dev/code/merriam-webster/.gitignore`
- `/Users/zeeshan-dev/code/merriam-webster/README.md`
- `/Users/zeeshan-dev/code/merriam-webster/src/search-learner.tsx`
- `/Users/zeeshan-dev/code/merriam-webster/src/lookup-learner.tsx`
- `/Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/lib/formatEntry.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/lib/audio.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/types.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/test/fixtures/learnerEntry.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/test/merriamWebster.test.ts`
- `/Users/zeeshan-dev/code/merriam-webster/src/test/formatEntry.test.ts`

### File Responsibilities

- `package.json`: Raycast manifest, commands, preferences, scripts, and dependencies
- `tsconfig.json`: TypeScript configuration for Raycast source and tests
- `vitest.config.ts`: Vitest configuration for local unit tests
- `README.md`: local setup, API key configuration, and command summary
- `src/types.ts`: normalized result types and lightweight raw response helpers
- `src/api/merriamWebster.ts`: API key access, fetch wrapper, response normalization, browser/search URLs
- `src/lib/audio.ts`: audio subdirectory/path derivation for Learner pronunciation audio
- `src/lib/formatEntry.ts`: Markdown rendering for the detail pane and copyable definition text
- `src/search-learner.tsx`: live search command with inline suggestions and detail pane
- `src/lookup-learner.tsx`: exact lookup command using a required command argument
- `src/test/fixtures/learnerEntry.ts`: stable sample API responses for tests
- `src/test/*.test.ts`: unit coverage for normalization, formatting, URL/audio helpers

### Shared Boundaries

- Commands consume only normalized `EntryResult` and `SuggestionResult` data
- Parsing and formatting stay outside the UI so they can be tested without Raycast runtime
- Browser and audio URLs are derived in helpers, not assembled ad hoc in components

## Task 1: Bootstrap the Raycast Workspace

**Files:**
- Create: `/Users/zeeshan-dev/code/merriam-webster/package.json`
- Create: `/Users/zeeshan-dev/code/merriam-webster/tsconfig.json`
- Create: `/Users/zeeshan-dev/code/merriam-webster/vitest.config.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/.gitignore`
- Create: `/Users/zeeshan-dev/code/merriam-webster/README.md`

- [ ] **Step 1: Initialize git for the new workspace**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git init
```

Expected: output includes `Initialized empty Git repository`

- [ ] **Step 2: Write the project manifest and config files**

```json
// /Users/zeeshan-dev/code/merriam-webster/package.json
{
  "name": "merriam-webster-raycast",
  "title": "Merriam-Webster Learner",
  "description": "Search Merriam-Webster Learner's Dictionary from Raycast",
  "icon": "icon.png",
  "author": "zeeshan-dev",
  "categories": ["Productivity", "Education"],
  "license": "MIT",
  "commands": [
    {
      "name": "search-learner",
      "title": "Search Learner Dictionary",
      "description": "Search Merriam-Webster Learner entries as you type",
      "mode": "view"
    },
    {
      "name": "lookup-learner",
      "title": "Lookup Learner Word",
      "description": "Lookup an exact Merriam-Webster Learner entry",
      "mode": "view",
      "arguments": [
        {
          "name": "term",
          "placeholder": "Word or phrase",
          "type": "text",
          "required": true
        }
      ]
    }
  ],
  "preferences": [
    {
      "name": "learnerApiKey",
      "type": "password",
      "required": true,
      "title": "Learner API Key",
      "description": "Your Merriam-Webster Learner's Dictionary API key"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.101.0",
    "@raycast/utils": "^1.17.0",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "@types/react": "^18.3.21",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  },
  "scripts": {
    "dev": "ray develop",
    "build": "ray build -e dist",
    "lint": "ray lint",
    "test": "vitest run"
  }
}
```

```json
// /Users/zeeshan-dev/code/merriam-webster/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*", "vitest.config.ts"]
}
```

```ts
// /Users/zeeshan-dev/code/merriam-webster/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
  },
});
```

```gitignore
# /Users/zeeshan-dev/code/merriam-webster/.gitignore
node_modules
dist
.DS_Store
.raycast
```

```md
<!-- /Users/zeeshan-dev/code/merriam-webster/README.md -->
# Merriam-Webster Learner Raycast Extension

## Setup

1. Install dependencies with `npm install`
2. Run the extension locally with `npm run dev`
3. In Raycast preferences, set `Learner API Key`

## Commands

- `Search Learner Dictionary`
- `Lookup Learner Word`
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm install
```

Expected: install completes successfully and creates `package-lock.json`

- [ ] **Step 4: Run the empty quality gates**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test
npm run lint
```

Expected:
- `npm run test` passes with no matching tests or an empty suite notice
- `npm run lint` fails because `src/search-learner.tsx` and `src/lookup-learner.tsx` do not exist yet

- [ ] **Step 5: Commit the scaffold**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore README.md
git commit -m "chore: bootstrap Raycast extension workspace"
```

Expected: one commit containing only workspace bootstrap files

## Task 2: Build and Test the Learner API Layer

**Files:**
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/types.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/lib/audio.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/test/fixtures/learnerEntry.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/test/merriamWebster.test.ts`

- [ ] **Step 1: Write the failing normalization and helper tests**

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/test/fixtures/learnerEntry.ts
export const learnerEntryResponse = [
  {
    meta: { id: "book:1", uuid: "uuid-1" },
    hwi: {
      hw: "book",
      prs: [{ mw: "ˈbu̇k", sound: { audio: "book0001" } }],
    },
    fl: "noun",
    shortdef: ["a set of printed sheets of paper that are held together inside a cover"],
    def: [
      {
        sseq: [
          [
            [
              "sense",
              {
                sn: "1",
                dt: [
                  ["text", "{bc}a set of printed sheets of paper that are held together inside a cover"],
                  ["vis", [{ t: "She borrowed a book from the library." }]],
                ],
              },
            ],
          ],
        ],
      },
    ],
  },
];

export const learnerSuggestionResponse = ["books", "booklet", "booking"];
```

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/test/merriamWebster.test.ts
import { describe, expect, it } from "vitest";
import { buildAudioUrl, buildLearnerBrowseUrl, normalizeLearnerResponse } from "../api/merriamWebster";
import { learnerEntryResponse, learnerSuggestionResponse } from "./fixtures/learnerEntry";

describe("normalizeLearnerResponse", () => {
  it("maps entry objects into normalized entry results", () => {
    const results = normalizeLearnerResponse(learnerEntryResponse);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      kind: "entry",
      headword: "book",
      partOfSpeech: "noun",
      pronunciation: "ˈbu̇k",
      shortDefinitions: ["a set of printed sheets of paper that are held together inside a cover"],
      examples: ["She borrowed a book from the library."],
    });
  });

  it("maps string arrays into suggestion results", () => {
    expect(normalizeLearnerResponse(learnerSuggestionResponse)).toEqual([
      { kind: "suggestion", value: "books" },
      { kind: "suggestion", value: "booklet" },
      { kind: "suggestion", value: "booking" },
    ]);
  });
});

describe("URL helpers", () => {
  it("builds a learner browse URL from a headword", () => {
    expect(buildLearnerBrowseUrl("book")).toBe("https://www.merriam-webster.com/dictionary/book");
  });

  it("builds a pronunciation URL for supported audio ids", () => {
    expect(buildAudioUrl("book0001")).toBe("https://media.merriam-webster.com/audio/prons/en/us/mp3/b/book0001.mp3");
  });
});
```

- [ ] **Step 2: Run the test file to confirm it fails**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/merriamWebster.test.ts
```

Expected: FAIL with module not found errors for `../api/merriamWebster`

- [ ] **Step 3: Implement normalized types and API helpers**

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/types.ts
export type SuggestionResult = {
  kind: "suggestion";
  value: string;
};

export type EntryResult = {
  kind: "entry";
  id: string;
  headword: string;
  partOfSpeech?: string;
  pronunciation?: string;
  audioUrl?: string;
  shortDefinitions: string[];
  examples: string[];
};

export type SearchResult = EntryResult | SuggestionResult;
```

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/lib/audio.ts
const NUMBER_PREFIX = /^[0-9]/;

export function audioSubdirectory(audioId: string) {
  if (audioId.startsWith("bix")) return "bix";
  if (audioId.startsWith("gg")) return "gg";
  if (NUMBER_PREFIX.test(audioId)) return "number";
  return audioId[0];
}
```

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts
import { getPreferenceValues } from "@raycast/api";
import { audioSubdirectory } from "../lib/audio";
import { EntryResult, SearchResult, SuggestionResult } from "../types";

type LearnerEntry = {
  meta?: { id?: string };
  hwi?: { hw?: string; prs?: Array<{ mw?: string; sound?: { audio?: string } }> };
  fl?: string;
  shortdef?: string[];
  def?: Array<{
    sseq?: Array<Array<[string, { dt?: Array<[string, unknown]> }]>>;
  }>;
};

type Preferences = {
  learnerApiKey: string;
};

export function getLearnerApiKey() {
  return getPreferenceValues<Preferences>().learnerApiKey;
}

export function buildLearnerBrowseUrl(headword: string) {
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(headword)}`;
}

export function buildAudioUrl(audioId?: string) {
  if (!audioId) return undefined;
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${audioSubdirectory(audioId)}/${audioId}.mp3`;
}

function cleanHeadword(headword?: string) {
  return (headword ?? "").replace(/\*/g, "").trim();
}

function extractExamples(entry: LearnerEntry) {
  const examples: string[] = [];

  for (const defBlock of entry.def ?? []) {
    for (const senseGroup of defBlock.sseq ?? []) {
      for (const senseItem of senseGroup) {
        if (senseItem[0] !== "sense") continue;
        const dt = senseItem[1].dt ?? [];
        for (const part of dt) {
          if (part[0] === "vis" && Array.isArray(part[1])) {
            for (const visual of part[1] as Array<{ t?: string }>) {
              if (visual.t) examples.push(visual.t);
            }
          }
        }
      }
    }
  }

  return examples;
}

function normalizeEntry(entry: LearnerEntry): EntryResult {
  const audioId = entry.hwi?.prs?.[0]?.sound?.audio;

  return {
    kind: "entry",
    id: entry.meta?.id ?? cleanHeadword(entry.hwi?.hw),
    headword: cleanHeadword(entry.hwi?.hw),
    partOfSpeech: entry.fl,
    pronunciation: entry.hwi?.prs?.[0]?.mw,
    audioUrl: buildAudioUrl(audioId),
    shortDefinitions: entry.shortdef ?? [],
    examples: extractExamples(entry),
  };
}

function normalizeSuggestion(value: string): SuggestionResult {
  return { kind: "suggestion", value };
}

export function normalizeLearnerResponse(payload: unknown): SearchResult[] {
  if (!Array.isArray(payload)) return [];
  if (payload.every((item) => typeof item === "string")) {
    return payload.map((item) => normalizeSuggestion(item));
  }
  return (payload as LearnerEntry[]).map((item) => normalizeEntry(item));
}

export async function fetchLearnerResults(term: string): Promise<SearchResult[]> {
  const apiKey = getLearnerApiKey();
  const url = new URL(`https://dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(term)}`);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Learner API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return normalizeLearnerResponse(payload);
}
```

- [ ] **Step 4: Run the tests to verify the helper layer passes**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/merriamWebster.test.ts
```

Expected: PASS with 4 passing assertions

- [ ] **Step 5: Commit the API layer**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git add src/types.ts src/lib/audio.ts src/api/merriamWebster.ts src/test/fixtures/learnerEntry.ts src/test/merriamWebster.test.ts
git commit -m "feat: add learner dictionary api helpers"
```

Expected: one commit with typed API and helper coverage

## Task 3: Build the Detail Formatter

**Files:**
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/lib/formatEntry.ts`
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/test/formatEntry.test.ts`
- Modify: `/Users/zeeshan-dev/code/merriam-webster/src/test/fixtures/learnerEntry.ts`

- [ ] **Step 1: Write the failing formatter tests**

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/test/formatEntry.test.ts
import { describe, expect, it } from "vitest";
import { normalizeLearnerResponse } from "../api/merriamWebster";
import { formatEntryMarkdown, formatEntryPlainText } from "../lib/formatEntry";
import { learnerEntryResponse } from "./fixtures/learnerEntry";

describe("formatEntryMarkdown", () => {
  it("renders a readable detail block for Raycast", () => {
    const [entry] = normalizeLearnerResponse(learnerEntryResponse);
    if (entry.kind !== "entry") throw new Error("expected an entry");

    const markdown = formatEntryMarkdown(entry);

    expect(markdown).toContain("# book");
    expect(markdown).toContain("**Part of speech:** noun");
    expect(markdown).toContain("**Pronunciation:** ˈbu̇k");
    expect(markdown).toContain("## Definitions");
    expect(markdown).toContain("1. a set of printed sheets of paper that are held together inside a cover");
    expect(markdown).toContain("## Examples");
    expect(markdown).toContain("She borrowed a book from the library.");
  });
});

describe("formatEntryPlainText", () => {
  it("creates copy-friendly definition text", () => {
    const [entry] = normalizeLearnerResponse(learnerEntryResponse);
    if (entry.kind !== "entry") throw new Error("expected an entry");

    expect(formatEntryPlainText(entry)).toContain("book (noun)");
  });
});
```

- [ ] **Step 2: Run the formatter test file to confirm it fails**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/formatEntry.test.ts
```

Expected: FAIL with module not found error for `../lib/formatEntry`

- [ ] **Step 3: Implement the Markdown and plain-text formatters**

```ts
// /Users/zeeshan-dev/code/merriam-webster/src/lib/formatEntry.ts
import { EntryResult } from "../types";

export function formatEntryMarkdown(entry: EntryResult) {
  const lines = [`# ${entry.headword}`];

  if (entry.partOfSpeech) {
    lines.push(`**Part of speech:** ${entry.partOfSpeech}`);
  }

  if (entry.pronunciation) {
    lines.push(`**Pronunciation:** ${entry.pronunciation}`);
  }

  lines.push("", "## Definitions");

  entry.shortDefinitions.forEach((definition, index) => {
    lines.push(`${index + 1}. ${definition}`);
  });

  if (entry.examples.length > 0) {
    lines.push("", "## Examples");
    entry.examples.forEach((example) => lines.push(`- ${example}`));
  }

  return lines.join("\n");
}

export function formatEntryPlainText(entry: EntryResult) {
  const heading = entry.partOfSpeech ? `${entry.headword} (${entry.partOfSpeech})` : entry.headword;
  const definitions = entry.shortDefinitions.map((definition, index) => `${index + 1}. ${definition}`).join("\n");
  const examples =
    entry.examples.length > 0 ? `\nExamples:\n${entry.examples.map((example) => `- ${example}`).join("\n")}` : "";

  return `${heading}\n${definitions}${examples}`.trim();
}
```

- [ ] **Step 4: Run the formatter tests**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/formatEntry.test.ts
```

Expected: PASS with 2 passing assertions

- [ ] **Step 5: Commit the formatter**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git add src/lib/formatEntry.ts src/test/formatEntry.test.ts src/test/fixtures/learnerEntry.ts
git commit -m "feat: add learner entry formatter"
```

Expected: one commit with copy and detail formatting support

## Task 4: Implement the Live Search Command

**Files:**
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/search-learner.tsx`
- Modify: `/Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts`
- Modify: `/Users/zeeshan-dev/code/merriam-webster/src/lib/formatEntry.ts`

- [ ] **Step 1: Add small helper coverage for empty searches and suggestion selection**

```ts
// Add to /Users/zeeshan-dev/code/merriam-webster/src/test/merriamWebster.test.ts
import { shouldSearchTerm } from "../api/merriamWebster";

it("requires non-empty trimmed search text", () => {
  expect(shouldSearchTerm("")).toBe(false);
  expect(shouldSearchTerm("   ")).toBe(false);
  expect(shouldSearchTerm("book")).toBe(true);
});
```

- [ ] **Step 2: Run the focused test to confirm it fails**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/merriamWebster.test.ts
```

Expected: FAIL with `shouldSearchTerm is not exported`

- [ ] **Step 3: Implement the live-search helpers and command**

```ts
// Add to /Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts
export function shouldSearchTerm(term: string) {
  return term.trim().length > 0;
}
```

```tsx
// /Users/zeeshan-dev/code/merriam-webster/src/search-learner.tsx
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, shouldSearchTerm } from "./api/merriamWebster";
import { formatEntryMarkdown, formatEntryPlainText } from "./lib/formatEntry";
import { SearchResult } from "./types";

export default function SearchLearnerCommand() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!shouldSearchTerm(searchText)) {
        setResults([]);
        setError(undefined);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const nextResults = await fetchLearnerResults(searchText);
        if (!cancelled) setResults(nextResults);
      } catch (caught) {
        if (!cancelled) {
          const message = caught instanceof Error ? caught.message : "Unknown error";
          setError(message);
          await showToast({ style: Toast.Style.Failure, title: "Lookup failed", message });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Merriam-Webster Learner"
      throttle
    >
      {!shouldSearchTerm(searchText) ? (
        <List.EmptyView title="Type a word to search the Learner's Dictionary" />
      ) : null}

      {error ? <List.EmptyView title="Lookup failed" description={error} /> : null}

      {results.map((result) =>
        result.kind === "entry" ? (
          <List.Item
            key={result.id}
            icon={Icon.Book}
            title={result.headword}
            subtitle={result.partOfSpeech}
            detail={<List.Item.Detail markdown={formatEntryMarkdown(result)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Definition" content={formatEntryPlainText(result)} />
                <Action.CopyToClipboard title="Copy Headword" content={result.headword} />
                <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(result.headword)} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={result.value}
            icon={Icon.MagnifyingGlass}
            title={result.value}
            subtitle="Suggestion"
            actions={
              <ActionPanel>
                <Action title="Search Suggestion" onAction={() => setSearchText(result.value)} />
              </ActionPanel>
            }
          />
        ),
      )}
    </List>
  );
}
```

- [ ] **Step 4: Run tests and static checks for the live search command**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/merriamWebster.test.ts src/test/formatEntry.test.ts
npm run lint
```

Expected:
- tests PASS
- lint still FAILS because `src/lookup-learner.tsx` is not implemented yet

- [ ] **Step 5: Commit the live search command**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git add src/search-learner.tsx src/api/merriamWebster.ts src/lib/formatEntry.ts src/test/merriamWebster.test.ts
git commit -m "feat: add live learner search command"
```

Expected: one commit for the interactive search experience

## Task 5: Implement Exact Lookup, Final Verification, and Docs

**Files:**
- Create: `/Users/zeeshan-dev/code/merriam-webster/src/lookup-learner.tsx`
- Modify: `/Users/zeeshan-dev/code/merriam-webster/README.md`
- Modify: `/Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts`

- [ ] **Step 1: Write the failing exact-term helper test**

```ts
// Add to /Users/zeeshan-dev/code/merriam-webster/src/test/merriamWebster.test.ts
import { normalizeLookupTerm } from "../api/merriamWebster";

it("trims lookup arguments before requesting the API", () => {
  expect(normalizeLookupTerm("  book  ")).toBe("book");
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test -- src/test/merriamWebster.test.ts
```

Expected: FAIL with `normalizeLookupTerm is not exported`

- [ ] **Step 3: Implement exact lookup and finish documentation**

```ts
// Add to /Users/zeeshan-dev/code/merriam-webster/src/api/merriamWebster.ts
export function normalizeLookupTerm(term: string) {
  return term.trim();
}
```

```tsx
// /Users/zeeshan-dev/code/merriam-webster/src/lookup-learner.tsx
import { Action, ActionPanel, Detail, LaunchProps, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, normalizeLookupTerm } from "./api/merriamWebster";
import { formatEntryMarkdown, formatEntryPlainText } from "./lib/formatEntry";
import { SearchResult } from "./types";

export default function LookupLearnerCommand(props: LaunchProps<{ arguments: Arguments.LookupLearner }>) {
  const term = normalizeLookupTerm(props.arguments.term);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLearnerResults(term)
      .then(setResults)
      .finally(() => setIsLoading(false));
  }, [term]);

  const firstEntry = results.find((result) => result.kind === "entry");

  if (firstEntry && firstEntry.kind === "entry") {
    return (
      <Detail
        isLoading={isLoading}
        markdown={formatEntryMarkdown(firstEntry)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Definition" content={formatEntryPlainText(firstEntry)} />
            <Action.CopyToClipboard title="Copy Headword" content={firstEntry.headword} />
            <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(firstEntry.headword)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Suggestions for ${term}`}>
      {results.map((result) =>
        result.kind === "suggestion" ? (
          <List.Item key={result.value} title={result.value} subtitle="Suggestion" />
        ) : null,
      )}
    </List>
  );
}
```

```md
<!-- Replace /Users/zeeshan-dev/code/merriam-webster/README.md -->
# Merriam-Webster Learner Raycast Extension

## Setup

1. Run `npm install`
2. Run `npm run dev`
3. Open Raycast extension preferences
4. Set `Learner API Key` to `3b10486e-e0d9-49b8-bcdc-21d5a843c893`

## Commands

- `Search Learner Dictionary`: live search with inline suggestions and detail preview
- `Lookup Learner Word`: exact lookup command for a submitted term

## Quality Checks

- `npm run test`
- `npm run lint`
- `npm run build`
```

- [ ] **Step 4: Run the full verification suite and manual dev check**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
npm run test
npm run lint
npm run build
npm run dev
```

Expected:
- `npm run test` PASS
- `npm run lint` PASS
- `npm run build` PASS
- `npm run dev` starts Raycast development mode so you can manually verify:
  - the API key preference is recognized
  - live search returns entries and inline suggestions
  - exact lookup opens a detail view for a valid word
  - browser actions open Merriam-Webster for the selected headword

- [ ] **Step 5: Commit the exact lookup flow and docs**

```bash
cd /Users/zeeshan-dev/code/merriam-webster
git add README.md src/lookup-learner.tsx src/api/merriamWebster.ts
git commit -m "feat: add exact learner lookup command"
```

Expected: final feature commit with docs and both commands complete

## Self-Review

### Spec Coverage

- Live search command: covered in Task 4
- Exact lookup command: covered in Task 5
- Preference-based API key: covered in Task 1 and Task 2
- Shared API, parsing, and formatting utilities: covered in Task 2 and Task 3
- Rich detail rendering: covered in Task 3 and consumed in Tasks 4 and 5
- Inline suggestions: covered in Task 2 normalization and Task 4 UI
- Copy/open browser actions: covered in Tasks 4 and 5

### Placeholder Scan

- No `TODO`, `TBD`, or deferred-code placeholders remain in the task steps
- Each task includes concrete files, commands, and code snippets

### Type Consistency

- `EntryResult`, `SuggestionResult`, and `SearchResult` are defined in `src/types.ts` and reused consistently
- Helper names used later in the plan are introduced earlier in the API task or the same task where they are first referenced

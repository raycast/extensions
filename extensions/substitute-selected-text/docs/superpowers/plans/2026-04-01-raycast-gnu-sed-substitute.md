# Raycast GNU sed Substitute Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast command that applies GNU sed substitution rules to selected text with live preview, history, and favorites.

**Architecture:** Use a single Form command backed by small modules: rule parsing, sed execution, list-state operations, and LocalStorage persistence. Keep preview/apply behavior consistent by routing both through the same sed runner.

**Tech Stack:** TypeScript, React (Raycast command), @raycast/api, Vitest.

---

## File Structure

- Create: `package.json` - extension manifest, command metadata, scripts, preferences.
- Create: `tsconfig.json` - TypeScript compiler settings.
- Create: `README.md` - English usage and development docs.
- Create: `assets/icon.png` - extension icon.
- Create: `src/substitute-selected-text.tsx` - main command UI and actions.
- Create: `src/lib/rule-parser.ts` - parse `/pattern/replacement/flags` to `s...` expression.
- Create: `src/lib/rule-lists.ts` - pure operations for history/favorites.
- Create: `src/lib/gsed.ts` - gsed availability check and execution wrapper.
- Create: `src/lib/storage.ts` - LocalStorage repository.
- Create: `src/lib/paste.ts` - clipboard and paste-back helper.
- Create: `src/types.ts` - shared data types.
- Test: `src/lib/rule-parser.test.ts`
- Test: `src/lib/rule-lists.test.ts`
- Test: `src/lib/gsed.test.ts`

## Task 1: Scaffold Extension Metadata and Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `README.md`
- Create: `assets/icon.png`

- [ ] **Step 1: Add minimal extension manifest and scripts**
- [ ] **Step 2: Add TypeScript config**
- [ ] **Step 3: Add README (English)**
- [ ] **Step 4: Install dependencies and confirm test runner is available**

## Task 2: TDD Rule Parsing Module

**Files:**
- Create: `src/lib/rule-parser.ts`
- Test: `src/lib/rule-parser.test.ts`

- [ ] **Step 1: Write failing tests for valid slash delimiter, custom delimiter, escaped delimiter, and invalid expressions**
- [ ] **Step 2: Run tests and confirm failures are for missing implementation**
- [ ] **Step 3: Implement parser with optional leading `s` support and explicit error messages**
- [ ] **Step 4: Run parser tests and confirm pass**

## Task 3: TDD History/Favorites List Operations

**Files:**
- Create: `src/lib/rule-lists.ts`
- Test: `src/lib/rule-lists.test.ts`

- [ ] **Step 1: Write failing tests for history dedupe-to-front, max trimming, delete, clear, favorite add/remove, move up/down**
- [ ] **Step 2: Run tests and confirm RED state**
- [ ] **Step 3: Implement pure operations**
- [ ] **Step 4: Run tests and confirm GREEN state**

## Task 4: TDD GNU sed Runner

**Files:**
- Create: `src/lib/gsed.ts`
- Test: `src/lib/gsed.test.ts`

- [ ] **Step 1: Write failing tests with mocked executor for available/missing/execution-error cases**
- [ ] **Step 2: Run tests and confirm RED**
- [ ] **Step 3: Implement command execution abstraction + gsed helpers**
- [ ] **Step 4: Run tests and confirm GREEN**

## Task 5: Implement Persistence and Paste Helpers

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/paste.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Implement LocalStorage-backed repositories for history and favorites**
- [ ] **Step 2: Implement paste helper (clipboard write + return focus + cmd+v simulation)**
- [ ] **Step 3: Verify TypeScript compile for helper modules**

## Task 6: Implement Raycast Form Command

**Files:**
- Create: `src/substitute-selected-text.tsx`

- [ ] **Step 1: Load selected text + gsed prechecks with fail-fast behavior**
- [ ] **Step 2: Implement Form state, debounced preview, and apply action**
- [ ] **Step 3: Implement favorites and recents actions (use/move/delete/clear/unfavorite)**
- [ ] **Step 4: Ensure failed apply attempts are still recorded in history**

## Task 7: Verify and Document

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Update README with usage notes and gsed requirement**

## Self-Review

- Spec coverage: includes parser, preview/apply via gsed, history/favorites management, fail-fast startup, and documentation.
- Placeholder scan: no TODO/TBD placeholders in executable tasks.
- Type consistency: shared item types defined centrally and reused in storage/list/command modules.

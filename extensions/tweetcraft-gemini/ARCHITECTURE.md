# Architecture

This document describes the repository as of `v1.2.0`.

The code is a Raycast extension written in TypeScript. Commands share a common rewrite pipeline and Gemini client.

## Command entry points

### `src/natural.ts`

Entry point for the Natural rewrite command.

### `src/punchy.ts`

Entry point for the Punchy rewrite command.

### `src/short.ts`

Entry point for the Short rewrite command.

### `src/reply.ts`

Entry point for the Reply rewrite command.

These command files should remain thin. Shared behavior belongs in the common orchestration layer.

### `src/check-setup.ts`

Validates configuration and connectivity assumptions for the extension.

Setup checks should avoid exposing secrets in output.

### `src/recent-drafts.tsx`

Raycast interface for local draft history.

Responsibilities include:

- showing recent records,
- copying original Chinese,
- copying successful English output,
- retrying failed rewrites,
- deleting a record,
- clearing history,
- showing the most recent error state.

## Shared rewrite pipeline

### `src/run-rewrite.ts`

Coordinates the user-facing rewrite flow.

Expected responsibility order:

1. receive text and mode,
2. save or update the local draft record,
3. stop safely if local persistence fails,
4. call Gemini,
5. validate the response,
6. copy English on success,
7. update history on success,
8. copy original Chinese and record a categorized error on failure,
9. show appropriate Raycast feedback.

This file is the main place to inspect when changing end-to-end behavior.

## Gemini integration

### `src/gemini.ts`

Contains Gemini request behavior.

Responsibilities may include:

- reading Raycast preferences,
- constructing the Gemini request,
- explicit proxy handling,
- timeout behavior,
- parsing the response,
- converting low-level failures into useful error information.

Do not store the API key or include it in thrown error messages.

### `src/proxy.ts`

Normalizes explicit HTTP/HTTPS proxy preferences and produces a credential-free route label for diagnostics. Connection code receives the complete proxy URL; UI and history receive only the redacted label or a generic connection failure.

## Prompt system

### `src/prompts.ts`

Defines prompt behavior for each rewrite mode.

Prompt output should preserve intent and factual content while producing natural English for X.

Prompt changes should be evaluated as product changes, not treated as simple refactoring.

## Local history

### `src/history.ts`

Adapts Raycast `LocalStorage` to the history repository and preserves the command-facing API.

### `src/history-repository.ts`

Owns local draft persistence and policy. Each record uses a separate v2 storage key so overlapping Raycast command instances cannot overwrite unrelated drafts. The legacy v1 array is migrated on first read and removed only after valid records are copied.

Core policies:

- local storage only,
- maximum 50 records,
- delete records older than 30 days,
- deduplicate identical Chinese submissions within 5 minutes,
- store error category,
- update an existing record after retry,
- never store the API key.

Keep all retention, validation, migration, and deduplication rules inside this module so commands cannot diverge.

## Types

### `src/types.ts`

Shared TypeScript types for modes, records, statuses, and errors.

Persisted types should be treated carefully because older local records may still exist after an extension update.

## Raycast configuration

### `package.json`

Defines extension metadata, commands, preferences, scripts, and dependencies.

The manifest contains the Raycast Store author handle and US English command metadata.

### `raycast-env.d.ts`

Raycast-generated or Raycast-specific type declarations.

### `tsconfig.json`

TypeScript configuration.

### `eslint.config.js`

Lint configuration.

## Assets

### `assets/icon.png`

Extension icon.

## Tests

`tests/history-repository.test.ts` exercises concurrent writes, v1 migration, malformed records, retention, limits, deduplication, and retry-in-place behavior through the repository interface. `tests/proxy.test.ts` prevents proxy credentials from entering diagnostics.

## Data flow

```text
Raycast command
    ↓
mode-specific entry point
    ↓
shared runRewrite orchestration
    ↓
save original Chinese locally
    ↓
Gemini request through explicit network/proxy handling
    ↓
success ─────────────── failure
    ↓                      ↓
copy English           copy original Chinese
update record          record categorized error
show HUD               show safe error feedback
```

## Architectural constraints

- Command entry files should stay thin.
- History policy should remain centralized.
- Gemini networking should remain centralized.
- Prompts should be centralized and testable.
- API keys must remain in Raycast preferences only.
- Local history should never become cloud synchronization by accident.

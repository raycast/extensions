# AGENTS.md

This repository is maintained with human and AI coding agents.

Read these instructions before editing the project.

## Non-negotiable rules

1. Keep the extension local-first.
2. Never upload or persist user drafts outside the configured Gemini request.
3. Never store, print, commit, or expose API keys.
4. Preserve the original Chinese input before starting a Gemini request.
5. Do not break existing Raycast commands or aliases without explicit approval.
6. Keep failure behavior safe: the user must be able to recover the original text.
7. Maintain explicit proxy support; do not assume Raycast inherits Terminal environment variables.
8. Prefer TypeScript and official Raycast APIs.
9. Avoid unnecessary dependencies.
10. Keep changes small enough to review.

## Before changing code

Inspect at minimum:

- `package.json`
- `src/run-rewrite.ts`
- `src/gemini.ts`
- `src/history.ts`
- `src/prompts.ts`
- the command entry file related to the task

Do not infer behavior from documentation alone when the code is available.

## Coding style

- Use small focused functions.
- Prefer explicit names over clever abstractions.
- Keep side effects near command orchestration.
- Centralize shared behavior rather than copying it between commands.
- Return actionable, user-safe error messages.
- Keep persisted data schemas versionable.
- Avoid logging full user input unless a task explicitly requires local diagnostics and the privacy impact has been reviewed.

## History behavior

Any history change must preserve these invariants:

- maximum 50 records,
- automatic cleanup after 30 days,
- five-minute deduplication window,
- local storage only,
- no API key storage,
- categorized errors,
- successful retry updates the original record.

When changing the storage schema, include a backward-compatible migration or graceful fallback.

## Network behavior

- Requests may need an explicitly configured HTTP proxy.
- Distinguish proxy failures from generic network failures where possible.
- Use bounded timeouts.
- Do not retry blindly in ways that may create duplicate requests or unexpected cost.
- Preserve the user's original text before network activity.

## Prompt changes

Prompt changes are product changes.

Before changing a prompt:

1. identify the target mode,
2. preserve meaning and factual claims,
3. avoid adding unsupported facts,
4. keep output appropriate for X,
5. test representative Chinese examples,
6. compare against current behavior.

See `PROMPTS.md`.

## Validation

Run:

```bash
npm install
npm run build
```

Run lint when available:

```bash
npm run lint
```

If lint fails only because the manifest still contains the placeholder Raycast author, report that separately rather than hiding other lint failures.

## Git workflow

Use a focused branch for non-trivial work:

```bash
git switch -c codex/<short-task-name>
```

Commit messages should state the user-visible outcome, for example:

```text
Improve retry recovery for failed rewrites
```

Do not commit:

- `.env` files,
- API keys,
- `node_modules`,
- local Raycast data,
- build artifacts that are already ignored,
- user draft history.

## Response expectations for coding agents

At the end of a task, report:

- what changed,
- which files changed,
- validation performed,
- known limitations,
- suggested next step only when it is directly relevant.

Do not claim runtime success with Gemini unless an actual request was tested with the user's configured environment.

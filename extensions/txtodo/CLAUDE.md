# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension for managing tasks in the [todo.txt](http://todotxt.org) plain-text format. The user's `~/todo.txt` (and `~/done.txt`) is the **source of truth** — the extension reads, mutates, and writes the file directly; it never holds task state behind an internal database.

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | `ray develop` — loads the extension into Raycast for live testing. Required for any visual UI verification. |
| `npm run build` | `ray build -e dist`. Writes to `~/.config/raycast-x/extensions/txtodo/`. |
| `npm test` | Run the full Vitest suite once. |
| `npm test -- src/priority.test.ts` | Run a single test file. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run lint` | `biome check .` |
| `npm run lint:fix` | `biome check --write .` |
| `npm run format` | `biome format --write .` |
| `npx tsc --noEmit` | Type-check without emitting (useful in sandboxes where `ray build` can't write outputs). |

## Project structure

```
.
├── src/
│   ├── *.tsx            ── Raycast command entry points (one per command in package.json)
│   ├── priority.ts      ── Shared priority squircle helper used by tasks.tsx and menu-bar.tsx
│   ├── preferences.ts   ── Typed wrapper around Raycast preferences
│   ├── components/      ── Reusable UI components imported by entry points
│   ├── domain/          ── Pure logic — parsing, mutators, sorting, tags, dates, view presets
│   ├── io/              ── Filesystem layer (todo.txt read / atomic write / watch)
│   └── __mocks__/       ── Vitest stub for @raycast/api
├── docs/superpowers/    ── Date-prefixed specs and implementation plans
├── scripts/             ── One-shot maintenance scripts (e.g. glyph path generation)
└── assets/              ── Extension icon
```

Tests live next to source as `*.test.ts`.

## High-level architecture

Three layers, separated deliberately:

1. **UI** — four Raycast command entry points at `src/*.tsx` (declared in `package.json` under `commands`). Thin wrappers over the layers below.
2. **`src/domain/`** — pure logic, no filesystem and no Raycast API imports. Parser, mutators, sorting, tag extraction, due-date math, view-preset filters. This is where unit tests live.
3. **`src/io/todoFile.ts`** — the **only** module that touches the filesystem. Reads, atomic tmp+rename writes with mtime-based optimistic-concurrency conflict detection, debounced `fs.watch`, and `done.txt` append.

**Why this split matters:** logic bugs and new features almost always belong in `src/domain/` — write the failing test there first. UI files don't own state; they call domain mutators and hand the result to `io/todoFile.writeAtomic`. Because exactly one file touches the filesystem, concurrent-edit semantics are confined to one place.

## todo.txt round-trip is load-bearing

The parser and serializer must round-trip any well-formed line. Domain mutators rebuild `task.raw` via the serializer after every change; **never** mutate `task.description` or other fields in a UI file without going through a domain mutator — `task.raw` is what gets written back to disk.

## UI conventions

Cross-renderer constraints, the priority squircle SVG system, and other UI gotchas live in the `ui-conventions` skill (`.claude/skills/ui-conventions/SKILL.md`). Consult it before changing anything in `src/priority.ts` or the SVG used by `tasks.tsx` / `menu-bar.tsx` — there is a non-obvious reason the letters are `<path>` glyphs rather than `<text>`.

## Vitest setup quirk

`@raycast/api` is a Raycast-only runtime package that cannot be resolved by Node/Vite. `vitest.config.ts` aliases it to a minimal stub at `src/__mocks__/@raycast/api.ts`. Add to that stub whenever a test (or a module a test imports) needs another export from the Raycast API.

Coverage scope is intentionally limited to `src/domain/**` and `src/io/**` — UI files are not unit-tested.

## Working in this repo

- **Specs and plans** for non-trivial changes live under `docs/superpowers/specs/` and `docs/superpowers/plans/`, date-prefixed. Check there for design rationale before guessing at intent.

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this is

A Raycast extension (single command `solve-wordle`, mode `view`) that suggests the next best Wordle guess from prior guesses + color feedback. Entropy-maximizing solver (3Blue1Brown style) with a frequency-rank sigmoid prior over candidate answers.

## Commands

```bash
npm run dev           # ray develop — opens command in Raycast (test changes here)
npm run build         # ray build
npm run lint          # ray lint
npm run fix-lint      # ray lint --fix
npm test              # vitest run
npx vitest run -t "speed"   # single test by name
npm run build:data    # regenerate src/data/wordlists.ts from data-src/*.txt
npm run build:turn2   # regenerate src/data/turn2-lookup.json (depends on wordlists.ts)
npm run build:all     # build:data && build:turn2
```

`build:*` are **offline data-pipeline scripts**, not part of `ray build`. Re-run only when `data-src/answers.txt`, `data-src/guesses.txt`, or `data-src/frequency.txt` change.

## Architecture

```
src/solve-wordle.tsx          ← entry; the entire UI lives here
src/lib/
  types.ts                    Color | Pattern | PatternCode | Guess | GameState
  constants.ts                STARTER ("salet"), STORAGE_KEY, TURN2_LOOKUP, prior tunables
  pattern.ts                  fast Uint8Array two-pass scorer (load-bearing)
  prior.ts                    sigmoid frequency prior → Float64Array weights
  solver.ts                   filterAnswers, expectedEntropy, bestGuess
  pattern.test.ts             vitest, dup-letter cases
src/data/
  wordlists.ts                GENERATED — ANSWERS, GUESSES, GUESS_SET, FREQ_RANK
  turn2-lookup.json           GENERATED — 243 starter-pattern → best-2nd-guess
data-src/                     raw txt input for the data pipeline
scripts/                      build-data.ts, build-turn2-lookup.ts, sanity.ts
```

### Data flow per turn

`solve-wordle.tsx` reads `state.guesses` via `useLocalStorage(STORAGE_KEY)`, then a `useEffect` recomputes the suggestion in three branches:

- **Turn 1** (no guesses): show `STARTER` — no compute.
- **Turn 2** (1 guess, equals `STARTER`): `TURN2_LOOKUP[patternCodeToKey(...)]`. Skips the heavy solve.
- **Turn 3+**: filter `ANSWERS` through prior guesses via `filterAnswers`, build sigmoid priors over survivors, `bestGuess(candidates, GUESSES, weights)`. Normally <1s.

UI state: `Suggestion = "loading" | "word" | "solved" | "stuck"`. Solved = last pattern's `encodePattern` equals `ALL_GREEN_CODE`. Stuck = zero candidates (inconsistent feedback).

### Pattern computation — duplicate-letter trap

`computePatternCode` in `src/lib/pattern.ts` is the perf-critical path (~6.5M calls per turn-3 solve). It must be **two-pass**: greens first (decrementing `answerLeft[26]`), then yellows. Single-pass implementations silently miscolor cases like `speed × abide` → `[G,G,Y,G,Y]`. The test file pins these; don't rewrite without rerunning `npm test`.

`PatternCode` is a base-3 packed int 0..242 (position 0 most-significant). `patternCodeToKey` zero-pads to a 5-char string (e.g. `"02100"`) — the JSON key format for `turn2-lookup.json`.

### UI design — Raycast constraints baked in

The single-`<List>` UX is forced by Raycast API limits, not aesthetic preference:

- `Action.CopyToClipboard` closes the main window — replaced by plain `Action` + `Clipboard.copy()` so the user stays in the extension between turns.
- The List search bar is the guess input (`filtering={false}` + `onSearchTextChange`). Raycast doesn't expose an `onSubmit`, so a `useEffect` sets `selectedItemId = "letter-0"` once the typed word becomes a valid `GUESS_SET` member — Enter then fires that row's primary action.
- Bare-key shortcuts and clickable accessories don't exist. Color cycling uses Enter (or `⌘↑/⌘↓/⌘1/⌘2/⌘3`) on a per-letter `List.Item`, with the colored `tag` accessory standing in for a tile background.
- Only primary + secondary action shortcuts surface in the bottom bar; every row's `subtitle` spells out shortcuts inline. Action ordering matters — the first `<Action>` gets Enter, the second gets ⌘Enter (e.g. past-guess rows put benign "Copy Word" first so Enter doesn't accidentally undo).

## Working with data files

`src/data/wordlists.ts` and `src/data/turn2-lookup.json` are **generated** — never hand-edit. Rebuild via `npm run build:all`. `build-data.ts` asserts `ANSWERS ⊆ GUESSES` and auto-merges with a warning if not.

`STARTER` is fixed at `"salet"` because `turn2-lookup.json` was precomputed for that opener. Changing `STARTER` invalidates the lookup — re-run `build:turn2`.

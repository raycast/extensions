# Contributing to Brew

Thanks for contributing. This guide covers what this extension expects beyond the
[Raycast contribution guide](https://github.com/raycast/extensions/blob/main/CONTRIBUTING.md) —
mostly the things review keeps catching here.

## Requirements

- **Homebrew 6.0 or later.** 7.x is supported. Two whole commands need it and are wrapped in
  `HomebrewGate`, which renders an explanation instead of the command on an older brew: Show
  Vulnerabilities (`brew vulns`) and Run Doctor (`brew doctor --json`). One action is gated
  inline on the same version instead — cask link/unlink in `src/components/actionPanels.tsx`. The
  dry-run previews are **not** gated: `--dry-run` predates 7, so they run anywhere. See
  `HOMEBREW_7` in `src/utils/brew/version.ts`, `src/components/requiresHomebrew.tsx`, and the
  compatibility section in [README.md](README.md).
- Node.js — `@raycast/api` declares `>=22.22.2`.
- Raycast.

## Getting started

```bash
npm install
npm run dev      # reloads in Raycast as you edit
```

## Before you open a PR

All four must be green. `ray lint` does not typecheck at all, and a plain `ray build` does not
either — this repo's `build` script is `ray build -e dist`, which does (it prints
`checked TypeScript`). Run `tsc --noEmit` anyway: it is the gate reviewers run, and it does not
depend on which build environment the script happens to pass.

```bash
npx tsc --noEmit    # exit 0
npm run lint
npm run build
npm test            # vitest
```

Also run `npm run check:analytics` if you touched analytics parsing. It hits
formulae.brew.sh live, by design — it verifies the API contract that fixtures cannot.
It fails offline; that is not a reason to remove the network calls.

## Tests

Pure logic lives under `src/utils/` and is tested with vitest. `@raycast/api` has no
resolvable entry outside the Raycast runtime, so `vitest.config.mts` aliases it to
`src/utils/__mocks__/raycast-api.ts`. That stub returns the **declared preference defaults**
from `package.json` — if you add a preference with a default, tests see it.

Anything that renders is not covered. State that plainly in the PR rather than implying
a test proves a visual change.

## Formulae vs casks: the trap

The most common bug in this extension, by a wide margin, is code that loses track of whether
a package is a formula or a cask and builds a brew command without `--cask`. It has been found
in review repeatedly, in different guises, and it is worth assuming your change has a version
of it.

The rules:

- **`isCask()` keys off `token`.** `brew outdated --json=v2` reports casks with a `name` and
  **no token**, so an outdated cask is indistinguishable from a formula until
  `normalizeOutdatedResults()` synthesizes one. Every parser of that payload, and every read
  of a cached one, must call it. Skipping one silently reintroduces the bug.
- **Don't write a value guard.** Both kinds now report `pinned`, so `"pinned" in x` no longer
  identifies a formula. Two previous guards broke this way.
- **Pass the kind explicitly** where you have it (`PinKind`, the `isCask` prop on the outdated
  action panels) rather than re-deriving it downstream.
- A wrong kind is not a type error. `tsc` passes; brew then operates on the wrong package.

## Pinning

A pin is a lock, and Homebrew enforces it:

- `brew upgrade <name>` on a pinned package **fails** (exit 1) when named explicitly, and only
  warns on a bare `brew upgrade`. The extension names every package, so pinned ones must be
  filtered out before the run — otherwise a deliberate skip is reported as a failure.
- `brew uninstall` refuses a pinned package of **either** kind without `--force`.
- Therefore: never offer a pinned row a bare upgrade, or a copy/terminal command it cannot run.
  An action may lift a pin only when it **names the unpin in its own title** — `PinAction`
  ("Unpin Formula") and `FormulaUpgradeAction` ("Unpin Formula and Upgrade *name*") are the two
  that do. `FormulaUninstallAction` takes the same consent through a confirmation instead, whose
  primary button reads "Unpin Formula and Force Uninstall".
  Decide from brew's pin directory, not the payload: it is a snapshot, and another command or the
  CLI may have moved the pin since the fetch — in either direction.
  Formulae and casks are both pinnable and behave identically here.

## What reviewers have asked for

- **Don't reorder existing action panels.** Adding an action at the top pushes Upgrade, Pin and
  the copy actions down and changes muscle memory. Add to the end of the relevant section, or
  say why the new order is better. The test that matters is **what ↩ does**: an addition that
  leaves the first action alone is safe whatever else moves, and one that takes the first slot
  changes what every existing muscle-memory ↩ runs. A section shipping for the first time in
  your PR has no prior default and is not covered by this at all.
- **A failure must not read as success.** A failed `brew outdated` that shows a success toast,
  or an empty list that reads as "nothing to upgrade", is the single most repeated finding on
  this extension. If a fetch fails, say so on screen.
- **Long operations need an indicator before the work starts**, not after.
- **Every `Toast.Style.Failure` needs a Copy Error / Copy Logs action** so a user can report
  what actually happened.
- **Match the icon vocabulary** in `src/components/palette.ts` — `STATUS_COLOR` names meanings, not
  colours: green up to date, blue in progress or informational, orange needs attention (update
  available, deprecated), red brew refused or failed, secondary-text muted. `SEVERITY_COLOR` maps
  advisory severity on top of it, and is the only place yellow appears (LOW). Pick a meaning from
  those tables rather than a `Color.*` literal. `Color` may still be named outside `palette.ts`
  where it is structural rather than semantic — as a type (`Color`, `Color.ColorLike`), or for the
  menu-bar icon's `Color.PrimaryText` tint, which is a platform requirement for a template icon
  and not a status.

## Homebrew is the source of truth

Do not describe Homebrew behaviour from memory — read its source (`$(brew --repo)`) or
[docs.brew.sh](https://docs.brew.sh). Comments in this codebase have been confidently wrong
about brew for months at a time, including claims about features that already shipped. Cite the
Ruby file when a non-obvious behaviour drives your change.

## CHANGELOG

Add a **new** top entry using the `{PR_MERGE_DATE}` placeholder — Raycast CI stamps it on merge:

```markdown
## [Short Title] - {PR_MERGE_DATE}

- What a user notices, not how the code works
```

Never edit an entry that already carries a real date, and never leave more than one
placeholder. Describe the observable effect: a bullet about internals goes stale the moment
they are refactored, and nothing compiles a changelog.

## Pull requests

- Title: `Update Brew extension`, or `[Brew] <fix>` when one change dominates. No Conventional
  Commits.
- Describe the change for someone who has never seen the code, and double-check the description
  names *this* extension.
- Say what you tested by hand. Anything visual is eyes-only.

## Useful links

- [Contribute to an extension](https://developers.raycast.com/basics/contribute-to-an-extension)
- [Prepare an extension for the Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Extension guidelines](https://manual.raycast.com/extensions)
- [Homebrew documentation](https://docs.brew.sh)

# Contributing

Thanks for looking. This is a small, opinionated codebase: a Raycast extension for macOS and
Windows that talks to a **local** Hermes API Server. Most of the rules below exist because
something already went wrong once.

## Before you start

- **Read the docs in priority order.** They govern the project and outrank anything you infer from
  the code: [`docs/DECISOES-VERIFICADAS.md`](docs/DECISOES-VERIFICADAS.md) (decisions proven
  against a real Hermes) → [`docs/UX-SPEC.md`](docs/UX-SPEC.md) (screens, copy, shortcuts) →
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (module contracts, error catalog, traps) →
  `docs/research/` (the API research everything rests on). They are written in Portuguese.
- **The interface language is English. The comments are Portuguese.** Every user-visible string —
  command titles, screen copy, toasts, error messages — is English, hard-coded at the call site.
  It was Brazilian Portuguese until the release described in [CHANGELOG.md](CHANGELOG.md). The
  comments follow the surrounding file, and the surrounding file is Portuguese: that is
  deliberate, and translating them is not an improvement. Do not add an i18n layer without
  opening an issue first — Raycast does not localize an extension, so a layer would still have to
  ship one language, which makes it a product decision rather than a refactor.
- **Action titles are Title Case; screen prose is a sentence.** `@raycast/prefer-title-case` is on
  for the whole of `src`, with no file-level disable left anywhere. If it flags a title, fix the
  title — do not silence the rule.
- **The extension is local-only.** It talks to `127.0.0.1` and nothing else. A change that adds a
  remote mode needs a discussion before code.
- **One code base, two systems.** The manifest declares `"platforms": ["macOS", "Windows"]`.
  What differs between them is deliberately confined to three places, and new differences belong
  in the same three: `defaultHermesHome()` in `src/lib/discovery.ts` (where the Hermes files
  live), `src/lib/platform.ts` (the wording that names system programs and keys), and
  `perPlatform()` in `src/components/shortcuts.ts` (the keys themselves). **Do not add
  `if (process.platform === ...)` to a screen** — pass the platform in, so a test can cover both
  without a second machine.

## Setup

Requirements: **Node.js 24+** and Raycast (macOS or Windows).

```bash
npm install
```

```bash
npm run dev
```

`npm run dev` uses `--target release`. Every build script does. On Windows, without that flag the
output lands in the old Raycast X path and Raycast reports `Missing executable`; on macOS the flag
is harmless, so the scripts stay identical.

## Gates a change must pass

All five, green, before you open a pull request. CI runs exactly these.

```bash
npm test
```

```bash
npx tsc --noEmit -p tsconfig.json
```

```bash
npx tsc --noEmit -p tests/tsconfig.json
```

```bash
npx eslint src tests
```

```bash
npm run lint
```

```bash
npm run build:dist
```

Tests are plain TypeScript run by the Node test runner (`node --test`) with native type stripping —
no Jest, no Vitest, no transform step. That is why Node 24 is a hard requirement.

### And one gate that is not a command

Anything that touches a live Hermes — streaming, approvals, keyboard flows, the Raycast window
itself — is **not** covered by the automated suite and cannot be verified by any automation
available here. Walk [`docs/CHECKLIST-MANUAL.md`](docs/CHECKLIST-MANUAL.md) by hand on a machine
with Hermes running, and say in the PR which items you actually ran **and on which system**. The
checklist has a macOS section that has never been walked; if you are on a Mac, that is the most
valuable thing you can contribute.

## Rules that are not details

- **Never put `cmd` in the Windows half of a keyboard shortcut.** Windows ignores it silently, so
  the shortcut simply does not exist and nothing tells you. Custom shortcuts are declared as
  `perPlatform(Windows, macOS)`; prefer `Keyboard.Shortcut.Common.*` wherever a semantic
  equivalent exists, because Raycast already maps those per system.
- **Never call a run's stop endpoint from a `useEffect` cleanup.** Unmounting a screen must cancel
  only the local reader. The task stays alive inside Hermes on purpose — closing the Raycast window
  is not a cancellation.
- **Never log, render or copy the Hermes key.** It is redacted everywhere, including in the
  "technical details" payload. If you add a new error path, redact it there too.
- **Every action needs a place in the `Ctrl+K` / `Cmd+K` action panel.** No action may exist as a
  bare shortcut.

## Tests

New behavior comes with a test when the behavior is testable without a live Hermes — parsing,
contracts, state machines, storage, queueing, safety limits. Look at the existing files in `tests/`
for the shape; they use `node:test` and `node:assert/strict`, with hand-written doubles in
`tests/helpers/`.

Bug fixes come with a regression test that fails before the fix.

## Pull requests

- Branch off the repository's default branch and target it.
- Keep the change focused. A PR that fixes a bug and reorganizes three modules is two PRs.
- Describe **what breaks without this change**, not just what the code does.
- Update [`CHANGELOG.md`](CHANGELOG.md) when the change is user-visible. New entries use the
  `{PR_MERGE_DATE}` placeholder, which is the Raycast Store convention.
- If your change contradicts something in `docs/`, update the doc in the same PR — or explain why
  the doc was wrong.

## Reporting bugs

Include your operating system and its version, your Raycast version, the Hermes Agent version
(`GET /health` reports it, and **Check Hermes Connection** shows it), and the output of
**Copy Technical Details** if a screen offered it. That payload is already redacted — check it once before pasting anyway.

Security issues do not go in the issue tracker. See [SECURITY.md](SECURITY.md).

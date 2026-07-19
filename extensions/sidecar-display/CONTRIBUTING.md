# Contributing

Conventions and standards for working on Sidecar Display.

- **Setting up, running, testing, CI, and releasing** live in
  [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) — start there if you are picking the
  project up cold.
- **What it does and how it works** is in the [README](./README.md).
- This file is the _how we write it_ half: conventions, invariants, commits.

## TL;DR

```sh
npm install && npm run dev     # full Xcode required (compiles the Swift engine)
npm run lint && npm run build && npm run test:unit   # before every commit
```

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the deep version. In short:

- **Command entry points** (`src/*.ts(x)`) are thin — they read preferences,
  call one orchestration function, and render feedback. No logic lives here.
- **The orchestration** (`src/lib/sidecar.ts`) and the **keep-alive state
  machine** (`src/lib/keepalive.ts`) are pure — no `@raycast/api` import — so
  they're unit-tested headlessly against mocks. Keep testable logic in modules
  without a `@raycast/api` import; those are the ones `build:test` compiles.
- **Engines** implement the `SidecarBackend` interface (`src/lib/backend.ts`).
  The orchestration depends only on that interface, never on a concrete engine.
- **`src/lib/state.ts`** is the only module that touches `LocalStorage`.
- **The native engine** is Swift in `swift/`, exported to TypeScript with the
  `@raycast` macro and imported as `swift:../../swift`.

### Safety invariants — do not break these

These are enforced across every path and proven by tests. A past violation
scrambled every window and caused a logout.

1. **Never write the main display** (`--main`, or promoting the iPad to mirror
   master). Mirroring always keeps the current main as master; both mode writes
   are refused when the iPad is itself main.
2. **The connect/disconnect/mode path never disconnects or power-cycles a
   display.** The only sanctioned `--connected=` cycle is the isolated **Fix
   Mirroring** feature (`virtualscreens.ts`): it targets the main virtual screen
   by UUID, falls back to all _virtual_ screens when main is not itself one,
   never touches a physical display, and always reconnects (a rejected
   disconnect is tolerated, the reconnect still runs).
3. **Never write for a display that isn't present.** Mode writes happen only when
   `readMirror` returns non-null; an absent display is never written.
4. **Never trust a single read after a write.** Poll/converge until the state
   settles or the timeout expires.

If you touch `sidecar.ts` or `virtualscreens.ts`, run `test:unit` (and
`test:safety` if BetterDisplay is available) before committing.

## Code conventions

### File naming

- **Command entry files** match their Raycast manifest `name` and are
  **kebab-case** (`connect-sidecar.ts`) — this is a Raycast requirement.
- **Library modules** are **camelCase** (`betterdisplay.ts`, `virtualscreens.ts`).
- **Swift** files are `PascalCase` (`SidecarBridge.swift`).
- **Tests** are `{name}.test.ts` under `test/` — named after the module they cover
  (`keepalive.test.ts`) or the scenario they exercise (`display-mode.test.ts`).
  They are TypeScript on Node's built-in runner (`node:test` + `node:assert`), so
  a mock that drifts from `SidecarBackend` fails to compile.

### Vocabulary

Two deliberate splits. Both are intentional; keep them straight:

| User-facing                     | In code                                         | Why                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Engine** (the preference)     | `backend` / `SidecarBackend`                    | "Engine" reads better in a settings pane; `backend` is the code abstraction. The preference _key_ stays `backend` — it is internal and renaming it would orphan stored values. |
| **Fix Mirroring** (the command) | `virtualscreens.ts` / `reconnectVirtualScreens` | The command is named for the problem it solves; the module is named for the mechanism it uses.                                                                                 |

A command's `name` and a preference's `name` are **stable identifiers** — users'
hotkeys, aliases, and stored values bind to them. They are free to rename before
the first Store release and breaking after it.

### File banners

Every source file (`.ts`, `.tsx`, `.swift`, `.yml`) opens with an 80-char
"heavy" banner: an uppercase title, a one-line description, and optional
`Context:` / `NOTE:` / `WARN:` lines for anything non-obvious. Group related
functions with 60-char "light" section dividers. Comments explain **why**, never
restate the code.

### TypeScript

- Strict mode; **no `any`** (use `unknown` + narrowing). No `as` without a
  `// SAFETY:` note (the exceptions are idiomatic JSON/error narrowing casts).
- **Explicit return types** on every function. `interface` for object shapes,
  `type` for unions. Prefer early returns.
- **JSDoc on every export** (`@param`/`@returns`), first line not repeating the
  name.
- Keep functions ≤ 50 lines and files ≤ 300 (ESLint enforces, blank/comment
  lines excluded).
- Import groups, blank-line separated: external → internal → `import type`.

### Swift

- `@raycast` goes on **global functions only**; params `Decodable`, returns
  `Encodable`/`Void`; `throws`/`async` supported. Import `Foundation` in any
  file using the macro (the expansion needs it).
- Surface failures by **throwing** (`throw HelperError("…")`); the message
  reaches TypeScript as the rejected promise's `.message`. Never `exit()`.
- Keep the SidecarCore/CoreGraphics logic in `SidecarBridge.swift` and the thin
  `@raycast` wrappers in `Exports.swift`.

## Commits

- **Conventional Commits**: `type(scope): summary` (`feat`, `fix`, `refactor`,
  `test`, `chore`, `docs`). Imperative mood, lower-case summary.
- Keep commits atomic — one concern each. Update docs in the **same commit** as
  the code they describe.
- No AI attribution, no emoji.

## Testing

Tests are behavioural — they assert observable outcomes, not that a value was
stored. When adding a feature:

- If it's pure logic, add a hardware-free test (mock backend or stub CLI) and
  wire it into `test:unit` so CI covers it.
- If it touches hardware, add/extend a `test:hardware` case, but keep the safety
  guarantee provable without hardware where possible (as `virtualscreens.test.ts`
  does with a stub `betterdisplaycli`).

## Pull requests

- One concern per PR; fill in the checklist in the PR template.
- CI must be green: `lint`, `build` (compiles Swift + type-checks), `test:unit`.
- If you touched safety-critical code, say which suites you ran locally — CI
  cannot run the hardware ones.

## Where the rest lives

- **Setup, dev loop, testing matrix, CI, releasing, publishing, troubleshooting**
  → [docs/WORKFLOWS.md](./docs/WORKFLOWS.md)
- **Adding a command / engine / preference** →
  [docs/WORKFLOWS.md](./docs/WORKFLOWS.md#9-common-tasks)

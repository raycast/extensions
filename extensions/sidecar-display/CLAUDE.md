# Sidecar Display

Raycast extension (macOS) that connects an iPad over Sidecar and forces extend
(or mirror) without touching the main display. Two engines behind one interface:
BetterDisplay (`betterdisplaycli`) and a native Swift helper (`swift/`).

## Language rules

@~/.claude/rules/lang/typescript.md

## Human docs (do not duplicate here)

- [README.md](./README.md) — what it does and how to use it.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — how it works, the safety
  invariants, the design decisions, and the project layout.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — conventions and code standards.
- [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) — clone/dev/test/CI/release runbook.

## Architecture

- `src/lib/backend.ts` — the `SidecarBackend` interface every engine implements,
  plus shared types (`SidecarDevice`, `DisplayMode`) and `SidecarError`. The
  orchestration depends ONLY on this, so it is engine-agnostic and mockable.
- `src/lib/betterdisplay.ts` — `createBetterDisplayBackend(cliPath)`, the engine
  over `betterdisplaycli`. Reads tolerate rejection (`Failed.` on stderr, exit 1)
  and return `null`; writes throw.
- `src/lib/betterdisplaycli.ts` — the low-level `betterdisplaycli` exec primitive
  (`writeCli`/`readCli`/`tryReadCli`) and identifier parser, shared by the
  BetterDisplay engine and `virtualscreens.ts` so neither reinvents it.
- `src/lib/native.ts` — `createNativeBackend()`, the engine over the `@raycast`
  Swift functions in `swift/`, imported as `swift:../../swift`. No BetterDisplay.
- `src/lib/sidecar.ts` — display/link orchestration (`connectSidecar`,
  `disconnectSidecar`, `ensureDisplayMode`). Takes a `SidecarBackend`. Pure Node,
  no `@raycast/api` import, so `test/orchestration.test.ts` drives it with a mock.
- `src/lib/keepalive.ts` — pure decision state machine for background
  auto-reconnect. No I/O, unit-tested headlessly (`test/keepalive.test.ts`).
- `src/lib/virtualscreens.ts` — `reconnectVirtualScreens(cliPath)`, the mechanism
  behind the Fix Mirroring command (feature name vs mechanism name is deliberate).
  Always via `betterdisplaycli` regardless of engine, since the mirror is a
  BetterDisplay virtual-screen artifact.
- `src/lib/mirrorfix.ts` — `fixMirrorAfterFreshConnect(outcome)`, the single guard
  ("opt-in on + BetterDisplay present + `linkEstablished`") shared by every path
  that brings the link up, so Connect, the menu bar, and auto-reconnect cannot
  drift. The mechanism stays in `virtualscreens.ts`; this is only the gate.
- `src/lib/state.ts` — the only module that touches `LocalStorage`.
- `src/lib/preferences.ts` — maps Raycast's generated `Preferences` type into a
  `SidecarConfig`. Never hand-declare the preference shape; `ray build` generates
  it from `package.json`.
- `src/lib/feedback.ts` — HUD/toast text from a `ModeOutcome`.
- `src/*.ts(x)` — one thin command entry point each, no logic.
- `swift/Sources/Sidecar/` — `Exports.swift` (the `@raycast` functions) over
  `SidecarBridge.swift` (SidecarCore via `dlopen` + CoreGraphics). Compiled by
  `ray build`; no binary is committed.

Purity split: modules WITHOUT an `@raycast/api` import are the ones `build:test`
compiles and the unit tests drive. Keep testable logic there. (`native.ts` is
also `@raycast/api`-free but imports `swift:`, so it is hardware-validated.)

## Invariants — never break these

An earlier violation scrambled every window and caused a logout. These are
enforced on every path and proven by `test/orchestration.test.ts` plus
`test/safety.test.ts`.

- **Never write the main display.** No `--main` write; mirroring always keeps the
  current main as master with the iPad as target (the reverse promotes the iPad
  and macOS moves every window onto it). Both mode writes are refused when the
  iPad is itself main.
- **The mode path never disconnects or power-cycles a display.** The only
  sanctioned `--connected=off`/`on` cycle is `virtualscreens.ts`: it targets the
  main virtual screen by UUID, falls back to `--type=VirtualScreen` (all virtual
  screens) when main is not itself one, NEVER touches a physical display, and is
  guaranteed to reconnect (a rejected disconnect is tolerated; the reconnect
  always runs). Reached only from the Fix Mirroring command or the
  `fixMirrorAfterConnect` opt-in (`mirrorfix.ts`, shared by Connect, the menu bar,
  and auto-reconnect) — never from inside converge.
- **Never write for an absent display.** Mode writes happen only when `readMirror`
  is non-null. `get --sidecarList` lists paired-but-maybe-absent devices, so a
  resolved name is not proof of reachability.
- **If the iPad is the main display, leave its mode alone and report it.**
- **Never trust a single read after a write.** `ensureDisplayMode` re-asserts on
  every disagreeing read and only reports settled after `REQUIRED_STABLE_READS`
  (3) consecutive correct reads — macOS spends ~1s rearranging a fresh Sidecar
  display and often reports mirrored before flipping.
- **`set --sidecarConnected` is not idempotent.** It fails when the link is
  already in the requested state; read before writing.
- **Auto-reconnect only chases a link that dropped on its own.** Every manual
  connect/disconnect records intent via `recordIntent`; a deliberate disconnect
  is never fought. It never abandons a wanted link: fast burst, then a slow
  heartbeat. A long gap between ticks is the only available "wake" signal.

## Domain facts (established by testing, not documented upstream)

- **macOS Sidecar's own mirror mode is invisible to every display API** —
  CoreGraphics, `NSScreen`, and BetterDisplay all report the iPad as extended
  while it mirrors. It therefore CANNOT be detected; Fix Mirroring fires on a
  fresh connect as a proxy, never on a detected condition. Do not add
  "detect if mirrored" logic — it is not possible.
- `perform --reconfigure` exits 0 but does not clear this mirror (tried, removed).
- `NSScreen` omits mirrored displays; the native engine finds the Sidecar display
  by the AirPlay vendor signature (`0x6161706C`) so it works while mirrored.

## Toolchain pins — do not "helpfully" widen these

- `typescript` is `~6.0.3`, NOT `^6.0.3`. `@raycast/eslint-config` peer-requires
  `<6.1.0`, so a caret would break the install the day 6.1 ships. TypeScript 7 is
  impossible until Raycast widens that peer.
- `@types/node` stays on `22.x` to match `engines: node >=22.22.2`. Types ahead of
  the runtime make `tsc` accept calls that crash inside Raycast.
- `tsconfig.json` MUST keep `"types": ["node"]` — TypeScript 6 stopped
  auto-including `@types`, and without it every `node:` import fails to resolve.

Rationale and the matching `dependabot.yml` bounds: [docs/WORKFLOWS.md](./docs/WORKFLOWS.md).

## Verification

`npm run lint` and `npm run build` (which type-checks) must both be clean, and
`npm run test:unit` must pass — no hardware needed. Run `npm run test:safety`
after any orchestration change if BetterDisplay is available. Full commands and
the hardware suites: [docs/WORKFLOWS.md](./docs/WORKFLOWS.md).

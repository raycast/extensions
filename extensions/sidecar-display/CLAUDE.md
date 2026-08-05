# Sidecar Display

Raycast extension (macOS) that connects an iPad over Sidecar and forces extend
(or mirror) without touching the main display. The native Swift helper (`swift/`)
drives everything. BetterDisplay is NOT an engine: the mirroring problem it
repairs is CAUSED by running a BetterDisplay virtual screen as the main display,
so it is the fix for a problem only it creates, and nothing else shells out.

## Language rules

@~/.claude/rules/lang/typescript.md

## Human docs (do not duplicate here)

- [README.md](./README.md) — what it does and how to use it.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — how it works, the safety
  invariants, the design decisions, and the project layout.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — conventions and code standards.
- [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) — clone/dev/test/CI/release runbook.

## Architecture

- `src/lib/backend.ts` — the `SidecarBackend` interface the engine implements,
  plus shared types (`SidecarDevice`, `DisplayMode`) and `SidecarError`. The
  orchestration depends ONLY on this, so it is engine-agnostic and mockable.
- `src/lib/betterdisplaycli.ts` — the low-level `betterdisplaycli` exec primitive
  (`writeCli`/`readCli`/`tryReadCli`) and identifier parser, shared by the
  `virtualscreens.ts`; the mirror fix is its only consumer.
- `src/lib/native.ts` — `createNativeBackend()`, the ONLY engine, over the
  `@raycast` Swift functions in `swift/`, imported as `swift:../../swift`.
- `src/lib/sidecar.ts` — display/link orchestration (`connectSidecar`,
  `disconnectSidecar`, `ensureDisplayMode`). Takes a `SidecarBackend`. Pure Node,
  no `@raycast/api` import, so `test/orchestration.test.ts` drives it with a mock.
- `src/lib/keepalive.ts` — pure decision state machine for background
  auto-reconnect. No I/O, unit-tested headlessly (`test/keepalive.test.ts`).
- `src/lib/reachability.ts` — `probePresence(ipadName)`, the silent "is the iPad
  there, and how?" read, returning `{wireless, wired}`. Never throws: an
  unavailable probe degrades to null, which becomes "unknown".
- `src/lib/transport.ts` — pure policy: `presenceToReachability` (raw, what the
  menu bar reflects) and `isTransportAllowed` (does the user permit chasing over
  the transport it is on). These MUST stay separate. Reporting an excluded
  transport as "absent" made the hourly sanity attempt fire and SUCCEED — 24
  connects a day under "cable only" with a Wi-Fi-present iPad. An exclusion is a
  decision, not an uncertainty; there is nothing to re-check.
- `src/lib/virtualscreens.ts` — `reconnectVirtualScreens(cliPath)` plus
  `hasVirtualScreens(cliPath)`, the mechanism behind the Fix Mirroring command
  (feature name vs mechanism name is deliberate).
- `src/lib/mirrorfix.ts` — the ONE mirror-fix gate. `mirrorFixPath(requireOptIn)`
  checks, in order: the opt-in (automatic path only), BetterDisplay installed AND
  running (`usablePath()`), and a virtual screen existing — and RETURNS the
  validated path so no caller looks it up twice. `fixMirrorAfterFreshConnect`
  adds the `linkEstablished` check on top. The Fix Mirroring command, the menu
  action and the fresh-connect opt-in all go through it; they drifted before, and
  the menu path surfaced a raw `execFile` error as a toast. The mechanism itself
  stays in `virtualscreens.ts`.
- `src/lib/state.ts` — the only module that touches `LocalStorage`.
- `src/lib/preferences.ts` — maps Raycast's generated `Preferences` type into a
  `SidecarConfig`. Never hand-declare the preference shape; `ray build` generates
  it from `package.json`.
- `src/lib/feedback.ts` — failure toasts plus `refreshMenuBar()`, the
  `launchCommand` nudge that re-renders the menu-bar command.
- Menu-bar refresh: a menu-bar command renders ONLY when it runs, so the
  auto-reconnect tick pushes `refreshMenuBar()` (`launchCommand` background)
  whenever `shouldRefreshMenuBar` says the link or presence changed. Gated on a
  real change — never every tick. EVERY path that changes the link also calls
  `refreshMenuBar()` directly (Connect, Disconnect, and every menu-bar action);
  the tick is the fallback for changes nobody initiated. Do not rely on the tick
  for user-initiated changes: `recordIntent` resets state and wipes `lastLinkUp`,
  which made manual disconnect (false→false, no refresh) behave differently from
  manual connect (false→true, refresh). The predicate compares BOTH `lastLinkUp`
  and `lastReachability` — link, because a drop during sleep with auto-reconnect
  off moves no counter and fires no notice; and presence as the RAW reading, not
  the debounced `absentReads`, because a boolean counter only changes on the
  first absent tick and could never self-correct a mistimed render. Every
  transition is covered by the table in `test/presence.test.ts`, and the
  temporal invariants by `test/resilience.test.ts`. Staleness up to
  one refresh is inherent — Raycast has no residency and no display-change event.
- Icon scheme: ALWAYS the monitor glyph, never a shape change — connected green,
  nearby full-contrast (identical to connected bar the colour, name included),
  away and unknown greyed out with no name.
- Presence surfacing: the menu bar carries the persistent nearby/away cue; HUDs
  are limited to "nearby" when nothing will act on it (auto-reconnect off or a
  deliberate disconnect) and a once-per-chase "gave up". Never announce
  "no longer nearby" — Raycast has no Notification Center API, so a HUD fires
  onto a screen the user has just walked away from. Rationale: ARCHITECTURE.md.
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
  is non-null. The device list is unreliable in BOTH directions, established by
  testing: a listed device may still be unreachable (radios off — it stays listed
  with the presence bit clear), and an out-of-range device drops off the list
  ENTIRELY (`get --sidecarList` and SidecarCore both return nothing). So a
  resolved name is not proof of reachability, and an empty list is not proof the
  iPad does not exist. `loadConfig` remembers the auto-detected name for exactly
  that reason — without it, auto-detection throws while the iPad is away and
  takes the whole background tick with it.
- **If the iPad is the main display, leave its mode alone and report it.**
- **Never trust a single read after a write.** `ensureDisplayMode` re-asserts on
  every disagreeing read and only reports settled after `REQUIRED_STABLE_READS`
  (3) consecutive correct reads — macOS spends ~1s rearranging a fresh Sidecar
  display and often reports mirrored before flipping.
- **`set --sidecarConnected` is not idempotent.** It fails when the link is
  already in the requested state; read before writing.
- **Auto-reconnect only chases a link that dropped on its own.** Every manual
  connect/disconnect records intent via `recordIntent`; a deliberate disconnect
  is never fought. macOS posts its own error banner for every FAILED connect, so
  connect ATTEMPTS are the scarce resource, not ticks. A tick therefore probes
  first (`reachability.ts`, silent) and attempts only when the iPad is plausibly
  there; when it is absent the tick is free and silent. A long gap between ticks
  is the only available "wake" signal.
- **A wrong probe must never disable auto-reconnect.** The reachability bit is
  undocumented and has been seen to flicker, and a false "absent" fails silently
  (no banners, no reconnect) — worse than noise. Three guards, all proven by
  `test/keepalive.test.ts`, `test/presence.test.ts` and `test/resilience.test.ts`.
  TWO thresholds, deliberately different: going quiet is cheap and self-reversing,
  so it needs only `ABSENT_READS_BEFORE_TRUSTED` (2) consecutive absent reads;
  declaring an absence OVER is expensive — it clears the backoff and the give-up
  budget — so it needs `ABSENT_READS_BEFORE_SETTLED` (5). Collapsing them let a
  flapping probe re-arm the fast burst every three ticks; a sanity attempt still fires
  every `sanityAttemptMs` regardless of the probe; and an unavailable probe
  ("unknown" — the Swift helper could not answer) falls back to plain backoff
  AND leaves the give-up clock
  stopped, since the pre-probe extension never abandoned a wanted link.
- **The give-up budget ACCUMULATES chased time (`chasedMs`); it is never a start
  timestamp.** Each tick adds at most `wakeGapMs`, and only while the probe says
  "reachable". Sleep therefore contributes nothing (no ticks run) and needs no
  special case. Four ways this was got wrong, all now pinned by multi-tick tests
  in `test/resilience.test.ts`: advancing on "unknown" retired auto-reconnect
  after a day for anyone whose probe failed; a wall-clock start time let sleep
  spend the budget, producing "gave up" on wake with zero attempts; restarting
  that timestamp on wake made the budget UNREACHABLE (8730 failed connects over
  30 days, no give-up); reading absence untrusted let one flicker restart it; and
  RESETTING rather than freezing on "unknown" meant a single unanswerable read
  per day discarded a whole day of budget (8642 connects, no give-up). Freeze and
  reset are NOT interchangeable: only a settled absence or a return may zero it.
  Returning from absence also clears the backoff, so a returning iPad reconnects
  on the next tick instead of waiting out a heartbeat.

## Domain facts (established by testing, not documented upstream)

- **macOS Sidecar's own mirror mode is invisible to every display API** —
  CoreGraphics, `NSScreen`, and BetterDisplay all report the iPad as extended
  while it mirrors. It therefore CANNOT be detected; Fix Mirroring fires on a
  fresh connect as a proxy, never on a detected condition. Do not add
  "detect if mirrored" logic — it is not possible.
- **`SidecarDevice.status` bit 9 (`0x200`) tracks reachability** — set whenever
  the iPad is reachable (connected OR merely nearby and idle), cleared when its
  radios go. Established empirically on macOS 26.6 by sampling across connect,
  disconnect, and Airplane Mode; it is the only liveness signal SidecarCore
  exposes. Bits 1, 8 and 39 flap on their own and mean nothing usable, and
  `mediaRouteIdentifier`/`offersAdditionalDisplay` never change (persisted
  pairing records, not liveness). Bit 9 itself dipped once for ~10s while the
  iPad stayed connected — hence the debounce. Re-validate after macOS updates.
- **Bit 9 is WIRELESS reachability, not reachability.** Verified on macOS 26.6: an
  iPad connected and working over USB with Airplane Mode on reads bit 9 CLEAR. So
  bit 9 alone reports a cabled iPad as absent.
- **Bits 2 (`0x4`) and 24 (`0x1000000`) track the CABLE.** They move together and
  toggle reliably with the physical connection — verified over two full
  plug/unplug cycles in one session, Airplane Mode throughout:
  cable in `0x1880106` / out `0x880102` / in `0x1880106` / out `0x880102`.
  Nothing else exposes the cable: Sidecar-over-USB raises no NCM interface and
  does not appear in IOUSB, so this bitfield is the only signal.
  UNEXPLAINED: a 31 Jul sample read `0x1880106` (bits 2/24 set) in Airplane Mode
  with no cable knowingly attached — so treat "bits 2/24 set" as "something is
  attached", not as proof of a data cable, until that is understood.
  Do NOT infer presence from the paired list instead: an out-of-range iPad leaves
  the list, but an Airplane-Mode one stays in it, so listing proves nothing.
- `perform --reconfigure` exits 0 but does not clear this mirror (tried, removed).
- `NSScreen` omits mirrored displays; the Swift helper finds the Sidecar display
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

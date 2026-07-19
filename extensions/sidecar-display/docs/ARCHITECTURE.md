# Architecture

How Sidecar Display works, the safety invariants it enforces, the non-obvious
design decisions behind it, and where everything lives. For *what it does* and
how to use it, see the [README](../README.md); for the dev runbook, see
[WORKFLOWS.md](./WORKFLOWS.md).

- [The core problem: Sidecar's invisible mirror mode](#the-core-problem-sidecars-invisible-mirror-mode)
- [The connect flow: converge and hold](#the-connect-flow-converge-and-hold)
- [Safety: the main display is sacred](#safety-the-main-display-is-sacred)
- [Fix Mirroring](#fix-mirroring)
- [Auto-reconnect (keep-alive)](#auto-reconnect-keep-alive)
- [Two engines, one interface](#two-engines-one-interface)
- [Design decisions](#design-decisions)
- [Project structure](#project-structure)

---

## The core problem: Sidecar's invisible mirror mode

This is the insight the whole extension is built around.

macOS Sidecar has its **own** "Mirror / Use as Separate Display" toggle that is
**separate from display mirroring** and **invisible to every display API** —
CoreGraphics, `NSScreen`, and BetterDisplay all report the iPad as a normal
extended display even while it is showing a copy of your main screen. On a Mac
whose main display is a BetterDisplay virtual screen, the iPad routinely connects
in this state.

The consequence is stark: **you cannot detect "it came up mirrored"
programmatically** — there is no readable signal that distinguishes it. So the
extension cannot condition a fix on "is it mirrored?". Instead:

- It **extends by default** by attaching Sidecar programmatically (which usually
  avoids the problem entirely).
- When the problem does occur, the only thing that reliably clears it is
  disconnecting and reconnecting the **main BetterDisplay virtual screen**, which
  forces macOS to redo the whole arrangement so the iPad lands extended. That is
  exactly the manual "Reconnect virtual displays" fix, automated — see
  [Fix Mirroring](#fix-mirroring).

Because the mirror is a side effect of having a BetterDisplay virtual screen,
that fix inherently requires BetterDisplay, regardless of which engine is driving
Sidecar.

## The connect flow: converge and hold

On **Connect**, the extension:

1. Reads the Sidecar link state and attaches the iPad only if it is detached.
2. Waits for the iPad's display to become **stably present**.
3. If macOS has made the iPad the **main** display, it stops and reports — it will
   not change the mode of the main display.
4. Reads the iPad's mirror state. If it already matches the configured mode, it
   writes nothing.
5. Otherwise it asserts the mode (`--mirror=off` to extend, or folds the iPad into
   the current main's mirror set to mirror) and **re-asserts on every disagreeing
   read**, reporting *settled* only after the mode reads correct **three times
   running**.

Step 5 exists because macOS spends about a second rearranging a freshly connected
Sidecar display — it frequently comes up mirrored, then flips to extended a beat
later. A naive "set it once and trust the next read" races that window and reports
success too early (or fights it). Converge-and-hold outlasts the rearrange.

If the mode never settles, the extension **reports it and stops**. It does not
cycle, disconnect, or otherwise touch any other display to force the issue.

## Safety: the main display is sacred

Two hard invariants, enforced across every code path and every engine:

1. **The extension never writes the main display**, and the
   connect/disconnect/mode path never disconnects or power-cycles any display. Its
   entire mode-path mutation surface is: connect/disconnect the Sidecar link,
   detach the iPad from a mirror set, and add the iPad to the main display's mirror
   set.
2. **Mirroring always uses the existing main display as the master**, with the
   iPad as the target. The reverse direction would promote the iPad to master and
   make macOS move your main display — and every window — onto it. Both mode writes
   are refused outright when the iPad is itself the main display.

These aren't decoration. An earlier version reconnected virtual screens as a
"mitigation" whenever a mode wouldn't settle — and on a setup where a virtual
screen *is* the main display, that disconnected the main display, scrambled every
window, and once caused a logout. That mitigation was removed entirely. The only
place a display is ever cycled now is the explicit, opt-in
[Fix Mirroring](#fix-mirroring) action — which targets virtual screens only (never
a physical display) and always reconnects them.

## Fix Mirroring

Fix Mirroring disconnects and reconnects the **main** BetterDisplay virtual screen
— targeted by UUID, so no other virtual screen is touched — forcing macOS to redo
the arrangement so the iPad lands as a separate display. It briefly blanks your
main display; it's a single, deliberate cycle, never a loop.

If your main display is *not* itself a virtual screen (so there is no UUID to
target), it falls back to cycling all virtual screens. **Physical displays are
never touched in either case.**

Because Sidecar's mirror mode is undetectable (see above), the extension can't
fire it only "when mirrored." Instead:

- The **Fix Mirroring** command and the menu-bar action run it on demand.
- The **Fix Mirroring on fresh connect** preference (on by default) runs it once
  per *fresh* connect — whenever the iPad newly attaches, whether through Connect,
  the menu bar, or a background auto-reconnect after sleep, but not when you re-run
  Connect on an already-connected iPad. This matches the common case where the
  iPad mirrors every time it attaches. If yours only sometimes mirrors, turn the
  preference off and use the manual command when you need it.

Its "always reconnect even if the disconnect is rejected" guarantee is covered by
a unit test (`virtualscreens.test.ts`) so the screen can never be left down.

## Auto-reconnect (keep-alive)

Two switches gate it: the **Auto-Reconnect** switch (on by default) and Raycast's
**Background Refresh** on the *Auto-Reconnect Sidecar* command (in its Raycast
command settings). With both on, it restores the link after it drops — for example
when the Mac wakes from sleep or wifi hiccups. Flip the switch off to stop all
automatic reconnects while keeping manual connect and the "reconnect now" command.

The switch lives in two places: the **Auto-Reconnect** preference sets the default,
and the **Auto-Reconnect** item in the *Sidecar Status* menu bar is a one-click
toggle that overrides the preference from then on. It's deliberately conservative,
so it never nags, but it never abandons a link you want either:

- It reconnects **only** when auto-reconnect is enabled, you asked for the iPad to
  be connected (via Connect or the menu bar), and the link then dropped **on its
  own**.
- A **deliberate disconnect** stops it — it will not fight you.
- Running the command **by hand** reconnects now even with auto-reconnect off
  (preference or menu toggle) — a manual run is an explicit request, not automatic
  behaviour.
- On a drop it makes a burst of quick attempts with growing backoff (the *Fast
  Reconnect Attempts* preference), then slows to an occasional heartbeat retry. It
  does **not** give up permanently.
- **Waking the Mac re-arms it immediately.** There is no on-wake event for
  extensions, so a long gap between background ticks is read as "the Mac slept,"
  and the next tick reconnects at once rather than waiting out a backoff.

Reconnection lands within roughly one interval (about a minute) of a drop, not
instantly.

## Two engines, one interface

Both engines implement the same `SidecarBackend` interface (`listDevices`,
`isConnected`, `setConnected`, `readMirror`, `isIpadMain`, `extend`,
`mirrorToMain`). All the orchestration depends only on that interface, so it is
engine-agnostic and unit-testable against a mock.

- **BetterDisplay** wraps `betterdisplaycli`. Reads tolerate rejection (`Failed.`
  on stderr, exit 1) and return `null`; writes throw.
- **Native** calls Swift functions compiled from `swift/`: connect/disconnect via
  runtime-dispatched `SidecarCore` selectors (loaded with `dlopen`, so the binary
  links nothing private), and mirror control via public
  `CGConfigureDisplayMirrorOfDisplay`. It finds the Sidecar display by the AirPlay
  vendor signature — which, unlike `NSScreen`, still works while the display is in
  a mirror set.

The native engine relies on a private Apple framework, so a future macOS update
could change it (validated on macOS 26). If a native command starts failing after
an OS update, switch to BetterDisplay and the Swift can be patched. Both engines
honour the same safety guarantees.

## Design decisions

A few choices worth recording, since they're the non-obvious ones:

- **Detect nothing you can't detect.** The whole "fix mirroring" design bends
  around the fact that Sidecar's mirror mode is invisible to every API. Rather than
  pretend to detect it, the extension fires the fix on a *fresh connect* (a proxy
  for "just attached, might be mirrored") and otherwise leaves it to a manual
  action.
- **Converge, don't set-and-pray.** Every window-affecting mode change is
  re-asserted until it holds across several reads, because macOS rearranges a fresh
  Sidecar display asynchronously.
- **Never touch the main display; never cycle a display in the mode path.** Learned
  the hard way (a logout). The one sanctioned cycle is Fix Mirroring, isolated and
  guaranteed to reconnect.
- **Native as source, not a binary.** The Raycast Store rejects opaque bundled
  binaries, so the native helper is a Swift Package compiled by Raycast's pipeline
  via `extensions-swift-tools` — auditable, no committed artifact.
- **Pure decision logic, isolated from I/O.** The keep-alive state machine and the
  connect orchestration are pure functions with no `@raycast/api` import, so
  they're unit-tested headlessly with mocks — the safety invariants are proven
  without any hardware.
- **Menu-bar friendliness.** The status item shows a constant-width icon and does
  not auto-refresh, to stay friendly with menu-bar managers like Bartender or Ice.

## Project structure

```
sidecar-display/
├── src/
│   ├── connect-sidecar.ts          # command: connect + apply mode (+ fresh-connect fix)
│   ├── disconnect-sidecar.ts       # command: disconnect
│   ├── auto-reconnect.ts           # background command: keep-alive tick
│   ├── fix-mirroring.ts            # command: "Fix Mirroring"
│   ├── sidecar-status.tsx          # menu-bar command
│   └── lib/
│       ├── backend.ts              # SidecarBackend interface + shared types + SidecarError
│       ├── betterdisplay.ts        # BetterDisplay engine (betterdisplaycli)
│       ├── betterdisplaycli.ts     # low-level betterdisplaycli exec + identifier parsing
│       ├── native.ts               # Native engine (calls swift:../../swift)
│       ├── sidecar.ts              # orchestration: connect / disconnect / converge-and-hold
│       ├── keepalive.ts            # pure keep-alive decision state machine
│       ├── virtualscreens.ts       # the mechanism behind Fix Mirroring
│       ├── mirrorfix.ts            # shared "fix after fresh connect" guard
│       ├── preferences.ts          # Raycast preferences -> SidecarConfig; engine selection
│       ├── state.ts                # the only module touching LocalStorage
│       ├── messages.ts             # pure HUD text builders (no @raycast/api)
│       └── feedback.ts             # toast I/O + error reporting
├── swift/
│   ├── Package.swift               # SPM manifest (extensions-swift-tools)
│   └── Sources/Sidecar/
│       ├── Exports.swift           # the @raycast functions exported to TypeScript
│       └── SidecarBridge.swift     # SidecarCore (dlopen) + CoreGraphics logic
├── test/
│   ├── keepalive.test.ts           # unit: keep-alive state machine (no hardware)
│   ├── orchestration.test.ts       # unit: orchestration vs a mock backend (no hardware)
│   ├── messages.test.ts            # unit: HUD text builders (no hardware)
│   ├── virtualscreens.test.ts      # unit: Fix Mirroring vs a stub CLI (no hardware)
│   ├── safety.test.ts              # hardware: absent-device safety guard
│   ├── display-mode.test.ts        # hardware: mirror -> heal-to-extend
│   └── lifecycle.test.ts           # hardware: full connect/disconnect lifecycle
├── tsconfig.test.json              # test build: tests + the modules they import
├── scripts/preflight.js            # store-readiness gate, runs inside `publish`
├── .github/
│   ├── workflows/ci.yml            # lint + build + typecheck + unit tests
│   ├── workflows/release.yml       # tag -> GitHub Release
│   └── dependabot.yml              # weekly npm + actions updates
├── docs/WORKFLOWS.md               # the runbook: clone -> dev -> test -> ship
├── docs/ARCHITECTURE.md            # this file
├── assets/extension-icon.png       # the 512x512 store icon
├── metadata/                       # store screenshots (2000x1250)
└── CHANGELOG.md · README.md · CONTRIBUTING.md · SECURITY.md · CLAUDE.md · LICENSE
```

Each `src/*.ts(x)` is a thin command entry point with no logic; all logic lives in
`src/lib/`.

Note the deliberate split between the **feature** and its **mechanism**: the
user-facing command is `fix-mirroring.ts` ("Fix Mirroring"), while
`lib/virtualscreens.ts` is named for what it actually does — reconnect virtual
screens.

For the conventions these files follow (banners, naming, TypeScript/Swift rules),
see [CONTRIBUTING.md](../CONTRIBUTING.md).

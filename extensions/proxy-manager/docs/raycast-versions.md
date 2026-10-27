# Raycast versions: one build, v1 and v2

## What we pin

| | Version | Why |
|---|---|---|
| `@raycast/api` | `2.9.0` | Current major, so a Store submission uses the latest API. Verified to run on Raycast 1.104 as well (see below). |
| `@raycast/utils` | `2.3.3` | 2.x counterpart: `useCachedPromise`, `usePromise`, `showFailureToast`. |
| Node | `>= 22.22.2` | The runtime in both the 1.104 and 2.x apps. |
| TypeScript | `5.9.x` | Compiles with `react-jsx` and `noUncheckedIndexedAccess`. |
| `@types/react` | `19.0.10` | Must match `@raycast/api`'s peer dependency, or `ReactNode` resolves twice and every JSX element fails to type-check. |

Built with **bun**: `bun install`, `bun run dev`, `bun run build`. The `ray` CLI
is Node-based; bun runs it from `node_modules/.bin` and the shebang keeps it on
Node.

## What we may use

Everything in `src/` today: `List`, `List.Dropdown`, `List.EmptyView`, `Detail` +
`Detail.Metadata`, `Form` + `Action.SubmitForm`, `ActionPanel`, `Action.Push`,
`Action.Submenu`, `Action.CopyToClipboard`, `confirmAlert`, `showHUD`,
`showToast`, `Clipboard`, `Cache`, `getPreferenceValues`, `open`,
`launchCommand`, `useNavigation`, `environment.commandName`,
`getFrontmostApplication`, `BrowserExtension.getTabs`, `Icon`, `Color`,
`Keyboard.Shortcut.Common`.

All of it exists in 1.104 and is unchanged in 2.x. That intersection is the
contract: the dependency version may be 2.x, but the code stays inside it so
Raycast 1 keeps working.

## What we must not use

These arrived with API 2.0. The build would still compile (we are on 2.9.0), but
they would throw at runtime on Raycast 1.x:

| API | Replacement in this repo |
|---|---|
| `environment.entryPointType` / `entryPointName` / `entryPointMode` | `environment.commandName` (still an alias in 2.x) |
| `help.md` next to `package.json` | Preferences are optional, so no setup form exists to attach help to. Explain setup in the empty state and the README. |
| `captureMemorySnapshot` | none needed |
| `AI.refreshModels`, `ai.modelProvider`, `ai.mcp`, `ai.skills` | not used — those are Raycast-AI extension features, not agent skills |
| `platforms: ["Windows"]` | `["macOS"]`; the socket path is macOS-only |

If one of these becomes necessary, the trade-off is explicit: drop Raycast 1
support, use it, and re-verify everything on Raycast 2.

## How to verify both

```bash
bun install
bun run lint          # manifest, icon, ESLint, Prettier
bun run typecheck     # tsc --noEmit
bun test              # pure logic (host normalisation)
bun run build         # compile + type check without importing into Raycast
bun run dev           # imports into whichever Raycast is running
```

Manual smoke, once per Raycast major:

1. With Raycast 1 running, `bun run dev`, then run each of the five commands.
2. Confirm the consent sheet appears once and that "Read Only" still lets
   *Proxy Manager*, *Explain Host Routing* and *App Routing* render, while
   mutations fail with a clear message.
3. Scan the `ray develop` output for `undefined is not a function`-style runtime
   errors — those are the signature of a missing API symbol.
4. Repeat with Raycast 2 installed. Re-run `bun run dev` from this exact folder:
   a dev import is pinned to the path it was last built from, and moving or
   deleting that folder leaves a red triangle on every command.

## Why 2.9.0 still runs on Raycast 1 — measured, not guessed

The upgrade was done and then exercised, not assumed:

- `tsc --noEmit`, `ray build` and `ray lint` pass with **no source changes** — the
  code only touches APIs that exist in both lines.
- The 2.x CLI still targets `com.raycast.macos` and `~/.config/raycast`, and the
  manifest it writes is byte-identical to the 1.x build apart from the
  dependency versions.
- `@raycast/api` is provided by the running app, not bundled, so the dependency
  version changes the *toolchain and types*, not the runtime contract. The only
  way a 2.x build can break Raycast 1 is by touching a 2.0-only symbol, and the
  built bundle referenced none.
- **Every command was opened on Raycast 1.104** with the 2.9.0 build: the hub
  (routing row, frontmost app, clipboard suggestion, targets), App Routing
  (`This App` + five rules), Explain Host Routing (a wildcard match), and the Add
  Target form (prefilled from the clipboard). `getFrontmostApplication()` and
  `Clipboard` behaved as documented.

So the version is a **submission** decision, not a runtime one:

| Choice | Raycast 1 | Raycast 2 | Store review |
|---|---|---|---|
| `1.104.25` | verified | works (no breaking change in 2.0) | accepted, but the guide says "use the latest API" |
| `2.9.0` (current) | verified by hand | native | satisfies "latest" |

We ship `2.9.0` and hold the line on the API subset. The one thing that would
undo Raycast 1 support is a 2.0-only symbol sneaking into `src/`; that is what the
"what we must not use" table and the v1 guard in the skill enforce. If a future
API bump ever breaks Raycast 1, the fallback is one line:

```bash
bun add @raycast/api@1.104.25 @raycast/utils@1.19.1
bun run typecheck && bun test && bun run build
```

## Upgrade policy

Bumping `@raycast/api` across a major requires:

- `bun run lint && bun run typecheck && bun test && bun run build`;
- the manual smoke above on both Raycast versions;
- an update to this file and to `.agents/skills/raycast-extension/SKILL.md`
  (its "Project constraints" section names the pinned versions).

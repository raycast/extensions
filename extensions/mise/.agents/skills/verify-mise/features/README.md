# Mise Verification Map

This directory is the maintained source for verifying the user-facing
behavior of the Mise Raycast extension. Read this index before driving the
application, then use the matching feature file as the recipe.

## Mutating And Read-Only Journeys

Every sub-feature carries one tag:

- **READ-ONLY** reads mise and renders. Driving it changes nothing in mise.
  Some need a Raycast preference changed first (for example a bogus "Mise
  Path" for the missing-mise screens); those say so, and the preference must
  be restored afterwards.
- **MUTATES** changes the user's real mise state: `mise use`, `mise
  upgrade`, `mise uninstall`/`unuse`, `mise prune`, `mise cache clear`, or
  `mise run <task>`. This includes a Run in Terminal action that hands one
  of those to the terminal.

Branch verification on this machine drives READ-ONLY journeys only, unless
the human asks for a specific mutating one. For a MUTATES journey, prove the
command line with the unit tests, the integration suite's `--dry-run` cases,
or a `--dry-run` node probe, and report the live journey as not driven.

| Command | READ-ONLY journeys | MUTATES journeys |
| --- | --- | --- |
| `search-tools` | list, filter, backend query, detail, install-target dropdown, load error, missing mise | Use Globally, Use Globally in…, low-downloads retry, Remove, Run in Terminal |
| `installed-tools` | list, detail, version picker list, install-target dropdown, reveal/copy path, load errors, missing mise | Set Global Version, Upgrade, Uninstall Version, Run in Terminal, `{"upgrade": …}` context |
| `show-outdated` | list, subtitle, release notes, copy, refresh, load error, missing mise | Upgrade, Upgrade All, Run in Terminal, Upgrade All in Terminal, `{"upgrade": …}` context |
| `tasks` | list, open task file, copy command, load error, missing mise | Run in Terminal, Run and Show Output |
| `outdated-tools` | badge, list, failure row, Open Outdated Tools, Refresh, launch failure toast, missing mise | clicking a tool row, Upgrade All |
| `upgrade-all` | missing-mise HUD only | the launch itself |
| `prune` | missing-mise HUD only | the launch itself |
| `clear-cache` | disabled-by-default listing, missing-mise HUD | the launch itself |

## Baseline Preconditions

- Raycast.app is running (`pgrep -x Raycast`).
- No `ray develop` outside this run's process group serves any checkout of
  this extension (`doctor` checks this; the main checkout and every agent
  worktree under `.claude/worktrees/` share the `lachieh/mise` dev slot).
- When verifying another checkout, `VERIFY_REPO_ROOT` is set to it on every
  subcommand, and that checkout has `node_modules` (`npm ci`).
- `.agents/skills/verify-mise/bin/verify-mise up` has printed its `ready:`
  line, the `target:` line naming the expected branch and SHA, and the run
  directory.
- `.agents/skills/verify-mise/bin/verify-mise doctor` exits 0.
- The command being verified has its "Always Run Command" deeplink grant in
  Raycast on this machine. As of 2026-11-05 `show-outdated`, `tasks` and
  `outdated-tools` are granted here. Exit 2 (alert in the log) or 5 (Raycast
  window on screen, no `openCommand`) means the alert is up: run
  `verify-mise grant` at once (the alert vanishes when Raycast loses focus).
- `agent-desktop` is on PATH with Accessibility and Screen Recording granted
  (`agent-desktop status`). `grant`, `read`, `menu`, `filter` and `hide`
  use it.
- `mise tasks ls -g` lists `verify-mise:safe` before any Manage Tasks
  journey (see SKILL.md, "Never leave a window that can run something").
- Every journey ends with `verify-mise hide`, in the same Bash call as its
  `run`.
- Never drive a `ray develop` instance this skill's `up` did not start.

## Driving Conventions

- Start every recipe from a healthy `doctor` state unless its preconditions
  say otherwise.
- Drive a command either by deeplink (`verify-mise run <command>`) or by
  the keyboard path (`mark`, `focus`, `type`, `key return`, `await`). Send
  keys only through `verify-mise key`/`type`, which refuse when Raycast's
  window is not showing, and only after telling the human to keep hands off
  the machine until `await` returns.
- Treat every command name and JSON payload as literal; do not reformat
  `--arguments`/`--context` JSON before passing it through.
- Run every launch through `verify-mise run <command>`, not a bare `open`
  call; `open`'s exit code is never evidence by itself. The one exception is
  a deeplink with `fallbackText`, which `run` cannot build: `mark`, `open`,
  then `await` (see Search Tools).
- Turn on the "Debug Logging" preference when the exact mise command line
  matters; every call then appears in `ray-develop.log`.

## Proof And Skip Reporting

- Proof for a launch is the `VERDICT:` line in the evidence file `verify-mise
  run`/`await` writes, with the log lines behind it (SKILL.md, Evidence).
  In Raycast 2.11 `commandExited` blocks carry only `{ code: N }`, never an
  `entryPoint`, so per-command proof is one of these:
  - `no-view` commands (`upgrade-all`, `prune`, `clear-cache`) and the menu
    bar (`outdated-tools`): the `commandExited` code after `openCommand`.
  - `show-outdated`: its `updateCommandMetadata called` block with
    `entryPointName: "show-outdated"`.
  - `search-tools`, `installed-tools`, `tasks`: only extension console
    output in `ray-develop.log`, which needs "Debug Logging" on. Without it
    the verdict is weak (`openCommand` only, which names no command), and
    the paired shot carries the per-command part. Report it as weak.
- A weak verdict (exit 4) is a launch of some Mise command, not of a
  specific one. Never report it as strong proof.
- A screenshot from `verify-mise shot` captures only Raycast's own window;
  it is supporting evidence, so pair it with the log evidence, never
  substitute it.
- Record the feature ID, the target (`target:` line), the entry point used,
  and the evidence file path with every claim of "verified."
- Report an unreachable path with the exact command attempted and the unmet
  precondition (most commonly: missing "Always Run Command" grant, a stale
  build reported by `doctor`, or a MUTATES journey the human did not ask
  for).
- Do not report a skipped entry point as verified through a different path.

## Feature Entry Contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior, each
   tagged READ-ONLY or MUTATES.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-mise` starts with `Preconditions:` and uses
   labeled bullets that pair each user action with an exact command and
   observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable
handles, required state, commands, and observable proof.

## Shared Behavior

These apply to every command and are not repeated in each file.

- Operation toasts: an operation shows an animated toast with Cancel, mise's
  progress lines as its message, then a success toast or a failure toast
  whose message is mise's `mise ERROR` line (else its last stderr line) and
  whose action is "Copy Logs". Cancel ends with "Cancelled". Only one
  operation runs per worker; a second shows "Already running" / "Wait for
  the current mise command".
- "Close window after actions" closes Raycast when an operation starts and
  replaces the result toast with a HUD, losing "Copy Logs" and any retry.
- Load errors: when a view's main mise call fails and no cached data exists,
  the list is replaced by a warning empty view "Couldn't load from mise"
  whose description is mise's last stderr line, with "Retry" (⌘R) and "Copy
  Error". With cached data the rows stay and the error is silent. Secondary
  calls (Search Tools' `mise ls`, `mise config ls`, backend searches) show
  Raycast's default failure toast instead. Inducing a load error needs a
  broken mise call, so it is normally proven by the component tests.
- Missing mise: a "Mise Path" preference pointing at a file that does not
  exist is authoritative (nothing else is tried). Views then show the Detail
  "mise was not found" listing that path with Copy Install Command, Open
  Getting Started and Open Extension Preferences; no-view commands show the
  HUD "mise not found — set Mise Path in preferences".
- Run in Terminal opens the "Terminal Application" preference's app
  (Terminal when unset) and closes Raycast. When the terminal refuses, a
  failure toast "Could not open <app>" carries the error.

## Features

- [Search Tools](./search-tools.md) covers the `search-tools` view: the
  registry list with installed rows first, in-extension filtering,
  backend-prefixed queries such as `npm:prettier`, the detail pane, the
  "Install to" dropdown, Use Globally with the low-downloads retry, Remove
  on installed rows, Run in Terminal, and the load-error and missing-mise
  screens.
- [Show Installed Tools](./installed-tools.md) covers the `installed-tools`
  view: Active/Inactive sections, the detail pane, the Set Global Version
  picker with its "Install to" dropdown, Upgrade, Uninstall Version with
  confirmation, Run in Terminal, Show in Finder, and the `{"upgrade": ...}`
  launch context.
- [Show Outdated Tools](./show-outdated.md) covers the `show-outdated` view:
  `current → latest` rows, Upgrade and Upgrade All (in Raycast or the
  terminal), release notes, the "N outdated" root-search subtitle, and the
  `{"upgrade": ...}` launch context used by the menu bar.
- [Manage Tasks](./tasks.md) covers the `tasks` view: global tasks grouped
  by namespace, Run in Terminal, Run and Show Output, Open Task File and
  Copy Command.
- [Tools Menu Bar](./outdated-tools.md) covers the `outdated-tools` menu bar
  command: the count badge, the per-tool list, the failure row, the
  hand-off to Show Outdated Tools and its failure toast, and the 12-hour and
  post-upgrade refresh.
- [Upgrade All Tools](./upgrade-all.md) covers the `upgrade-all` no-view
  command: `mise upgrade` for every tool behind a toast, then the menu bar
  refresh.
- [Prune Unused Versions](./prune.md) covers the `prune` no-view command:
  `mise prune` with the "Prune Scope" preference.
- [Clear Cache](./clear-cache.md) covers the `clear-cache` no-view command,
  disabled by default: `mise cache clear`.

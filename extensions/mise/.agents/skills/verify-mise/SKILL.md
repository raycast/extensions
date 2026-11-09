---
name: verify-mise
description: Drive the Mise Raycast extension (lachieh/mise) in the real Raycast app on macOS through ray develop and raycast:// deeplinks, and prove a command ran from Raycast's own log plus screenshots. Use after changing extension code, before claiming a command works.
---

# verify-mise

Installs the extension into the user's running Raycast as a dev build,
launches commands by deeplink, and reads Raycast's log for proof. This is the
user's live Raycast and the user's real mise, not a sandboxed copy.

Helper: `.agents/skills/verify-mise/bin/verify-mise <subcommand>`, run from
any directory. If the Bash tool is sandboxed in this session, pass
`dangerouslyDisableSandbox: true` on every call: sandboxed `open` never
reaches Raycast and sandboxed `screencapture` fails with `could not create
image from display`. A `shot` that fails that way, or a `run` that finds
no Raycast log activity at all, is the sign. Read `features/README.md` and
the matching feature file before driving.

The proof signals below were read from Raycast 2.11.1 with ray CLI 2.4.1.
Raycast changes its log format between releases; if a launch you watched
on screen gets a `not launched` verdict, replay the log slice (`replay`,
below) before trusting the verdict.

## What may be driven

Every journey in `features/` is marked READ-ONLY or MUTATES. A MUTATES
journey changes the user's real mise state: it installs, uses, upgrades,
uninstalls, prunes, clears the cache, or runs a task. Branch verification on
this machine drives READ-ONLY journeys only, unless the human asks for a
specific mutating journey. Prove a mutating command line with unit tests or
a `--dry-run` node probe instead (each feature file says how).

## Never leave a window that can run something

This Mac is shared with the human and with other agent sessions that type into
other apps. On 2026-11-05 a Manage Tasks window left open after a check took
another session's stray Return. **Run in Terminal** then ran the user's real
`dotfiles:apply` (`chezmoi apply` plus `mise bootstrap dotfiles apply`). So:

- **Safe task only.** `~/.config/mise/conf.d/verify-mise.toml` defines the
  global task `verify-mise:safe`, which prints one line and changes nothing.
  Every Manage Tasks check runs `verify-mise filter verify-mise:safe` right
  after `run tasks`, so the selected row (the target of ⏎ Run in Terminal and
  ⌘⏎ Run and Show Output) is the safe task. Never run, or leave selected, any
  other task. Between `run tasks` and `filter` the first task is selected for
  about a second, so run them in the same Bash call and never pause between
  them. If `filter` cannot set the text, it closes the window and exits 3. If that file is missing, recreate it before driving `tasks`:

  ```toml
  [tasks."verify-mise:safe"]
  description = "Harmless test task for verify-mise; prints one line, changes nothing"
  run = "echo 'verify-mise:safe ran; nothing changed'"
  ```

- **Close the window after every check.** Run `verify-mise hide` once the
  evidence is captured. It sends Escape to the Raycast process only, so the
  key cannot reach another app. `down` does not close Raycast's window.
- **Pause when asked.** When another session asks for a pause, stop every
  `run`, `grant`, `filter`, `hide`, `key`, `type` and `focus`. Read-only
  `read`, `menu` (unless it would press Refresh), `doctor` and `shot` are
  fine. Run `hide` first if a Raycast window is open, then confirm the pause.
- Prefer `agent-desktop` (Accessibility, headless) over `key` and `type`:
  it never moves focus or the pointer.

## Target another checkout

By default the helper builds and checks the repo it lives in. Set
`VERIFY_REPO_ROOT=<path>` to point it at another checkout, such as an agent
worktree holding a PR branch that does not contain this skill:

```sh
VERIFY_REPO_ROOT=/path/to/worktree .agents/skills/verify-mise/bin/verify-mise up
```

- The override is the cwd for `ray develop`, the repo `doctor` compares the
  pidfile cwd against, and the `src/` the staleness check reads.
- Artifacts stay under this skill's own `artifacts/`, never in the target.
- Each run directory records the target in a `target` file (`repo_root=`,
  `head=` short SHA, `branch=`); `up` and `doctor` print it as `target:
  <root> (<branch> @ <sha>)`.
- Set the same `VERIFY_REPO_ROOT` on every subcommand of a run. `doctor`
  fails when it differs from the run's recorded `repo_root`, and `up`
  refuses (exit 2) while the current run's `ray develop` is alive for a
  different target: `down` first.
- The target needs its own `node_modules` (`npm ci` there). `up` refuses
  otherwise, because `npx` would otherwise fetch an unrelated `ray` package.

## Launch

- `verify-mise up` starts `npx --no ray develop` from the target repo,
  waits up to 60s for `built extension successfully` in its log, then up to
  15s for Raycast to log `Refreshed node extension models` for
  `e:n:lachieh/mise`. Prints a `ready:` line, the `target:` line and the run
  directory. Exit 2 if Raycast is not running, if the current run is alive
  for another target, or if a `ray develop` outside this run's process group
  has any checkout of this extension as its cwd (a `package.json` named
  `mise`). Every checkout builds into the same `lachieh/mise` dev slot.
  Calling it again while the run is healthy for the same target is a no-op.
- Run state: `.agents/skills/verify-mise/artifacts/<run-id>/` with
  `target`, `ray-develop.log`, `ray-develop.pid`, `commands/`, `shots/`.
  `artifacts/current` symlinks to the latest run and is left in place by
  `down`; set `VERIFY_RUN_ID` to address another run. `artifacts/` is
  gitignored.
- The pidfile holds the `npm exec ray develop` PID. `up` starts it in its
  own process group (pgid = that PID), and the `node .../bin/ray develop`
  child shares that group and counts as this run.
- `up --clear-cache` moves the extension's Cache store
  (`~/Library/Application Support/com.raycast.macos/extensions/mise/com.raycast.api.cache`)
  into `<run-dir>/raycast-cache-before` before starting. Every checkout
  shares that store, so a branch otherwise starts with whatever the last
  branch cached for `useCachedPromise`. Use it when checking several
  branches in a row, where a branch can crash on a result cached in a newer
  format by another branch (seen 2026-11-04: a main-based branch read a
  `{ tools, unchecked }` result as an array). Leave the cache in place
  when the question is "does this build survive what the store release
  cached", which is what users upgrading actually hit; that is how the
  same check caught a crash on first launch after an update.
- `ray develop` watches `src/` and rebuilds on save; the log shows
  `event - changed file ...` then a new `built extension successfully`.
- Grant: a deeplink launch from outside Raycast shows a "Request to run
  <Command>" alert (Run Command, Always Run Command, Cancel) until
  **Always Run Command** is pressed. The grant is per command and per
  machine. When `run` exits 2 or 5 (see Evidence), run `verify-mise grant`
  while the alert is up: it presses the button through `agent-desktop`
  (Accessibility, no pointer, no keystrokes). The alert vanishes when Raycast
  loses focus; if `grant` finds no button, `run` again and `grant` straight
  after. As of 2026-11-05 `show-outdated`, `tasks` and `outdated-tools` are
  granted on this machine. **Always Run Command** survived a full stop and
  restart of `ray develop`.

## Doctor

`verify-mise doctor` is read-only, prints one `PASS`, `FAIL`, or `INFO`
line per check, and exits 0 only when nothing failed: the target and its
branch and HEAD; the run's recorded target matches `VERIFY_REPO_ROOT` (or
the default); Raycast running; `ray version`; pidfile PID alive with cwd
equal to the target; build not stale (no `changed file` after the last
successful build, and no `src/` file newer than the log); no `ray develop`
for any checkout of this extension outside this run's process group;
Raycast log path found. Run it after every `src/` edit, and after switching
the target's branch, before trusting a `run`.

## Drive

`verify-mise run <command> [--arguments '<json>'] [--context '<json>'] [--timeout <s>]`

- Commands: `search-tools`, `installed-tools`, `show-outdated`, `tasks`,
  `outdated-tools` (menu bar), `upgrade-all`, `prune`, `clear-cache`. The
  last three mutate mise the moment they launch.
- Fires `open "raycast://extensions/lachieh/mise/<command>"`. `arguments`
  and `context` are URL-encoded query parameters per Raycast's documented
  deeplink format. `--context '{"upgrade":"<tool>"}'` on `installed-tools`
  or `show-outdated` runs an upgrade on open (MUTATES).
- `open` exits 0 regardless; proof comes only from Raycast's log and
  `ray-develop.log` after the mark (see Evidence). `run` waits up to the
  timeout (default 10s) for a strong signal and stops early when it sees
  one.
- In Raycast 2.11 a `view` command stays open and logs no `commandExited`
  while it is showing, so a view yields `Action performed: Mise:
  openCommand` plus whatever per-command signal it emits. Only
  `show-outdated` emits one by itself (`updateCommandMetadata`). For
  `search-tools`, `installed-tools` and `tasks`, turn on the "Debug Logging"
  preference (with the human's consent) so their mise calls reach
  `ray-develop.log`; otherwise the best verdict is weak, and a paired `shot`
  carries the rest.
- Menu-bar commands (`outdated-tools`) log no `openCommand`. Their proof is
  a `Menu bar: unloading worker` block for `c:n:lachieh/mise::-::<command>`
  with `reason: "render-completed"` (or `"callback-completed"` after a menu item such as Refresh is pressed), and a `commandExited` that names
  `entryPoint: "dev_/lachieh/mise/<command>"`. After `up`, Raycast restores
  the previous build's saved menu (`Menu bar: restoring persisted status
  items`) without running the command, and a deeplink often logs nothing,
  so a `not launched` verdict for `outdated-tools` right after `up` is
  normal. Use `menu` instead: it waits for this build's render.
- `verify-mise read <name>` saves the Raycast main window's accessibility
  tree to `ax/<name>.json` and prints its named nodes to `ax/<name>.txt`:
  rows, subtitles, accessories and the action bar. This is stronger than a
  screenshot for a view that logs only `openCommand`. Exit 3 when the
  window is hidden.
- `verify-mise menu <name> [--command <cmd>]` reads the extension's menu bar
  menu without opening it (`agent-desktop` `menu-bar-extras`) and saves it
  to `ax/`. It first requires a render of `<cmd>` (default `outdated-tools`)
  logged since `up`. If there is none, it presses the menu's own **Refresh**
  item, which only re-runs `mise outdated`, and waits up to 60s.
- `verify-mise filter <text>` sets the open list's search text through
  Accessibility, so the selected row is one you chose. `verify-mise hide`
  closes Raycast's main window.
- Keyboard path (the user's real entry point): `verify-mise mark`, then
  `focus` (opens Raycast's root search via `open "raycast://"` and waits for
  its window), `type "<Command Title>"`, `key return`, then
  `await <command> [--timeout <s>]`, which reads the log from the mark and
  writes the same evidence file as `run`. Dev builds show under
  "Development" with subtitle "Mise". Take a `shot` between `type` and
  `key return` to capture the Raycast window with the query typed.
- `key` and `type` send macOS `System Events` input (the terminal running
  the agent needs the Accessibility grant). `key` takes `return`,
  `escape`, `tab`, `space`, `backspace`, the arrows, a letter `a`–`z`, or a
  numeric key code, plus modifier flags `--cmd --shift --opt --ctrl` (⌘I is
  `key i --cmd`, ⌘K `key k --cmd`). Raycast hides the instant another app
  becomes active, and stray input then lands in whatever the human is
  using. Both commands refuse (exit 3) unless `process "Raycast"` has a
  visible window at that moment, but the check-to-send gap is real: tell
  the human to keep hands off the machine for the whole `focus` → `await`
  sequence, and run it as one Bash call.

## Evidence

- `run` and `await` write `artifacts/<run-id>/commands/<command>-<seq>.log`
  (`seq` counts from 1 per run directory): `via:` (the deeplink URL, or
  `keys`), the mark time in UTC and local, a `signals:` line, Raycast log
  lines appended after firing (first filtered, then in full; the filter is
  line-based, so a block's closing `}` is dropped there), new
  `ray-develop.log` lines, and one `VERDICT:` line. `run` and `await` print
  the evidence path and the verdict.
- Signals, all read from lines appended after the mark (Raycast 2.11.1):
  - `open`: `Action performed: Mise: openCommand`. Some Mise command opened;
    the line does not name which. Weak on its own.
  - `meta`: an `updateCommandMetadata called { … entryPointName:
    "<command>" … }` block. Strong and per command; only `show-outdated`
    emits it.
  - `exit`: the code of the first `commandExited { code: N }` block after
    `open`. In 2.11 these blocks carry no `entryPoint`, so the code is
    attributed by order only; `no-view` commands log it within about a
    second, while views log it only when dismissed. Raycast also logs `{
    code: 0 }` blocks when `ray develop` installs or refreshes the extension,
    which is why only blocks after `open` count. A block that does name an
    `entryPoint` for another command (older Raycast) is skipped.
  - `console`: any extension console line (a `HH:MM:SS` prefix) in
    `ray-develop.log`; with "Debug Logging" on, every mise call writes one.
    It counts only together with `open`.
  - `alert`: `isShowingAlert: true` before any `open`. Raycast logs it only
    when its window activates with the alert up; when the window was already
    showing it logs just `Main window reveal skipped`, so the alert is also
    checked on screen.
- Verdicts and exit codes:
  - `0` `launched code=0 (strong: commandExited after openCommand)`,
    `launched (strong: updateCommandMetadata for <command>)`, or `launched
    (strong: extension console output in ray-develop.log after openCommand)`.
  - `1` `launched code=<N> (strong: …)` with N ≠ 0, or `not launched (no
    openCommand and no Raycast window on screen)`.
  - `2` `not launched (grant required: Raycast showed an alert; click
    "Always Run Command")`.
  - `4` `launched (weak: openCommand only; no per-command signal within
    <t>s)`: pair it with a `shot`, and say "weak" when reporting it.
  - `5` `not launched (no openCommand; a Raycast window is on screen, so a
    grant alert may be waiting: check the screen)`. The on-screen check
    cannot read the window's contents, so this is a prompt to look, not
    proof of an alert.
- `verify-mise replay <command> <raycast-log> <first-line> [<last-line>]
  [<ray-develop-log>]` runs the same parser and verdict rules over a saved
  log slice, offline (no window probe). Use it to check the rules against a
  new Raycast release.
- `ray-develop.log` holds `ray develop`'s build lines (ANSI-coloured, no
  timestamp) and the extension's `console.log` output with a UTC `HH:MM:SS`
  prefix (the prefix format has not been re-checked on ray CLI 2.4.1). The
  "Debug Logging" preference makes every mise call log `mise <args> → exit
  <code> in <ms>ms` there, which is also the cheapest proof of the exact
  command line a journey ran. Raycast's log
  (`~/Library/Logs/com.raycast.macos/raycast-x-*.log`, newest by mtime) uses
  local time with a `[level HH:MM:SS.mmm]` prefix. Correlate by the
  appended-lines window, never by clock.
- `verify-mise shot <name>` captures only one Raycast window, never the
  whole display: the main window (layer 8, 750×475 on 2.11.1) when it is on
  screen, else Raycast's largest other on-screen window, such as a toast.
  It writes `shots/<name>.png` plus `shots/<name>-small.png`. `shot <name>
  --menubar` captures each of Raycast's menu bar items as
  `shots/<name>-<n>.png`. The window ids come from
  `CGWindowListCopyWindowInfo` through `bin/raycast-windows.js` (JXA, no
  Accessibility grant needed). When no Raycast window is on screen, `shot`
  exits 3 instead of capturing anything else. Raycast hides the instant
  another app becomes active, so take the shot right after `run`. Pair a
  screenshot with `run` evidence.
- Side effects live in mise itself (`mise` CLI, its config). When a human
  approves a mutating journey, read the state back with `mise` after the
  run.

## Cleanup

Run `verify-mise hide` first, so no Raycast window is left that can take a
stray key. `verify-mise down` sends TERM to the PID in the current run's pidfile,
which npm forwards to its `ray develop` child, waits up to 10s for that
process group to exit, and removes the pidfile. It exits 0 when nothing was
running, and 1 if the group is still alive after 10s. Returning before the
group exits made the next `up` see a dying `ray develop` (cwd already gone)
as foreign and refuse, so a back-to-back `down` then `up` across branches
depends on this wait. Evidence stays under
`artifacts/<run-id>/` (gitignored). Never `pkill` by name: the main checkout
and every agent worktree under `.claude/worktrees/` share the `lachieh/mise`
dev slot. Leave a foreign `ray develop` alone and report it.

## Helpers

- `bin/verify-mise up | doctor | run <command> [...] | mark | focus | type <text> | key <key> [--cmd|--shift|--opt|--ctrl] | await <command> [--timeout <s>] | shot <name> [--menubar] | replay <command> <log> <first> [<last>] [<devlog>] | down | help`
- `bin/raycast-windows.js` lists Raycast's on-screen windows (id, layer,
  alpha, bounds) for `shot` and the verdict's on-screen check.
- `VERIFY_RUN_ID=<id>` pins a run for every subcommand.
- `VERIFY_REPO_ROOT=<path>` targets another checkout of the extension.
- `features/README.md` and `features/<feature>.md` are the maintained map of
  what to drive and what proves it.

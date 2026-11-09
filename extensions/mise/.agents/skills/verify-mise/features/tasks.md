# Manage Tasks

Manage Tasks (command name `tasks`) is a `view` command that lists every
global task `mise tasks ls` reports, grouped by the namespace before the
first colon (`dotfiles`, `nvim`), with the task's description, its aliases
as search keywords and the config file that defines it. From a row the user
hands `mise run <task>` to their terminal (the primary action), runs it
behind a toast and reads the captured output in a Detail, opens the task's
config file, or copies the `mise run` line. Hidden tasks are not listed.
When mise cannot be found it shows the shared install screen.

## Sub-features

- `tasks-list` READ-ONLY. Placeholder "Search global tasks". One section per
  namespace in order of first appearance, count in the header; tasks with no
  colon sit under "Tasks". Rows: title `<name>`, subtitle the description, a
  tag with the defining file's name. Typing filters by name and alias. With
  no tasks the empty view reads "No global tasks" / "Add tasks under [tasks]
  in ~/.config/mise/config.toml".
- `tasks-run-terminal` MUTATES (runs the task). ⏎ "Run in Terminal" opens
  the "Terminal Application" (Terminal when unset) running `<mise path> run
  <task>` and closes Raycast. Ghostty and iTerm2 windows stay at a login
  shell prompt after the task ends. When the terminal refuses, the failure
  toast "Could not open <app>" carries the error.
- `tasks-run-capture` MUTATES (runs the task). ⌘⏎ "Run and Show Output"
  runs `mise run <task>` with "Running <task>…" (Cancel available), then
  "<task> finished" or "<task> failed" with "Copy Logs", and pushes a Detail
  titled with the task name holding stdout then stderr in a code block, with
  "Copy Output". The Detail is pushed after any completed run, failed ones
  included.
- `tasks-open-file` READ-ONLY. "Open Task File" opens the defining config
  file in its default app; "Copy Command" copies `mise run <task>`.
- `tasks-load-error` READ-ONLY. When `mise tasks ls` fails with no cached
  list, the shared "Couldn't load from mise" empty view replaces the list.
- `tasks-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The shared
  "mise was not found" Detail.

## How to get to it (user POV)

- Open Raycast's root search and type "Manage Tasks". While `ray develop` is
  running it appears under "Development" with the subtitle "Mise".
- Trigger the deeplink `raycast://extensions/lachieh/mise/tasks` (what
  `verify-mise run tasks` does).
- Extension preferences: "Mise Path", "Terminal Application", "Window
  Behavior", "Debug Logging".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `tasks` has its "Always Run Command" grant; fire with `--timeout 60` the
  first time on a machine.
- `mise tasks ls --json` run from `$HOME` in the same minute, for the
  expected names.
- The safe task exists: `mise tasks ls -g` lists `verify-mise:safe`
  (defined in `~/.config/mise/conf.d/verify-mise.toml`; SKILL.md has the
  TOML to recreate it).
- Running any task other than `verify-mise:safe` is MUTATES; only when the
  human asked, and only a task they name.

- **Launch and list (`tasks-list`).** As one Bash call: `verify-mise run
  tasks`, `verify-mise read tasks-list`, `verify-mise filter
  verify-mise:safe`, `verify-mise read tasks-safe`, `verify-mise hide`.
  `tasks-list.txt` holds the textfield "Search global tasks…" and one
  `statictext` per task name, matching `mise tasks ls -g --json`.
  `tasks-safe.txt` lists only `verify-mise:safe`, so it is the selected row
  under "Run in Terminal ↵". Never leave the window open on another task.
- **Run the safe task (`tasks-run-terminal` / `tasks-run-capture`).** Only
  with `verify-mise:safe` filtered and selected. These open Terminal or run
  through mise; even the safe task opens a Terminal window, so do this only
  when the run itself is what is being checked.
- **Run in Terminal (`tasks-run-terminal`).** MUTATES; only when asked. A
  terminal window opens running the task and Raycast closes. The command
  line is the `miseCommandLine` unit test and the launch scripts the
  `terminalLaunches` tests.
- **Run and Show Output (`tasks-run-capture`).** MUTATES; only when asked.
  The component test covers the push; from node, `runMise(loc,
  runTask("<task>").args)` shows what the Detail would hold.
- **Open Task File and Copy Command (`tasks-open-file`).** "Open Task File"
  moves focus to another app, so drive it last; "Copy Command" then `pbpaste`
  reads `mise run <task>`. The component test asserts both targets.
- **Missing mise (`tasks-missing-mise`).** Only with consent to change a
  preference: "Mise Path" → `/nonexistent/mise`, `run tasks`, shot, then
  clear it.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/tasks-<seq>.log`
  with `VERDICT: launched (weak: openCommand only …)` (exit 4) unless "Debug
  Logging" is on, in which case its mise calls in `ray-develop.log` make it
  `launched (strong: extension console output …)`; plus the paired shot,
  which carries the per-command part of a weak verdict. Report a weak
  verdict as weak.
  Keep the same-minute `mise tasks ls --json` name list with it.

## Gotchas

- On 2026-11-05 a Manage Tasks window left open after a check took another
  session's stray Return and ran `dotfiles:apply` in Terminal. Filter to
  `verify-mise:safe` and `hide` in the same Bash call as `run`.
- Tasks are the user's own scripts and can do anything; on this machine
  (2026-09) `dotfiles:apply` rewrites dotfiles through chezmoi and
  `nvim:sync` installs Neovim plugins. ⏎ on a row runs the task. Never run
  one to prove plumbing.
- `mise run <task> --dry-run` runs the task and passes `--dry-run` to it;
  the flag must come before the name. Never append it.
- In Raycast 2.11 a view logs no `commandExited` while it is open, and this
  view emits no per-command log line of its own, so without "Debug Logging"
  `run` waits the full timeout and ends with the weak verdict (exit 4). Run
  `run` in the background and take the shot while it waits.
- "Run and Show Output" runs with `MISE_YES=1` and no TTY, so a task that
  prompts or draws a TUI hangs until Cancel. With "Close window after
  actions" on, the window is closed when the Detail is pushed.
- `mise tasks ls` without `--hidden` omits `hide = true` tasks. Project-local
  tasks never appear: mise runs from `$HOME`.
- `mise run` installs any missing global tool before the task starts, so
  even a harmless task can install things. Check `mise ls` after any
  approved run.
- Ghostty and iTerm2 get the command wrapped in `$SHELL -il -c` so `.zshrc`
  exports (PATH, `CARGO_HOME`) apply; Terminal runs it in its own shell.

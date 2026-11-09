# Prune Unused Versions

Prune Unused Versions (command name `prune`) is a `no-view` command that
runs `mise prune` without opening a window: an animated toast "Pruning
unused versions…" with Cancel, then "Pruned unused versions", or "Prune
failed" with a "Copy Logs" action that stays on screen for three seconds.
`mise prune` uninstalls every installed version that no tracked config file
or tool stub requests, and drops tracked config links whose files are gone.
The launch itself mutates mise.

## Sub-features

- `prune-run` MUTATES. Launching shows the toast at once (no Raycast
  window), then "Pruned unused versions" with no message. The "Prune Scope"
  preference picks plain `mise prune` ("Tool versions and config links"),
  `--tools`, or `--configs`; the configs scope reads "Pruning stale config
  links…" → "Pruned stale config links".
- `prune-failure` MUTATES (the launch still runs mise). A failing `mise
  prune` shows "Prune failed" with mise's ERROR line and "Copy Logs" for
  about three seconds.
- `prune-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The HUD "mise
  not found — set Mise Path in preferences" shows and nothing runs.

## How to get to it (user POV)

- Open Raycast's root search and type "Prune Unused Versions". While `ray
  develop` is running it appears under "Development" with the subtitle
  "Mise". ⏎ runs it.
- Trigger the deeplink `raycast://extensions/lachieh/mise/prune` (what
  `verify-mise run prune` does).
- Extension preferences: "Mise Path", "Window Behavior", "Debug Logging";
  command preference "Prune Scope".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `prune` has its own "Always Run Command" grant; fire with `--timeout 60`.
- For `prune-run`: the human asked for it and accepts losing every
  unrequested version (`mise prune --dry-run` lists them); there is no undo
  short of reinstalling each.

- **Run (`prune-run`).** MUTATES; only when asked. `verify-mise run prune
  --timeout 60` and `verify-mise shot prune-toast` about 1s later. Read back
  with `mise ls --json`: the dry run's versions are gone. For branch
  verification, prove the line from node instead: `runMise(loc,
  [...prune(scope).args, "--dry-run"])` exits 0 and prints `mise
  <tool>@<version> [dryrun] uninstall` lines on stderr; the integration
  suite covers the `--tools` and `--configs` forms.
- **Failure (`prune-failure`).** Not drivable without a failing mise; the
  `runOperation` unit tests cover the failure toast; the three-second hold is
  untested.
- **Missing mise (`prune-missing-mise`).** Only with consent to change a
  preference: "Mise Path" → `/nonexistent/mise`, `verify-mise run prune
  --timeout 60`: the HUD shows and `commandExited { code: 0 }` lands within a
  second. Clear the preference after; a cleared preference makes the next
  launch prune for real.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/prune-<seq>.log`
  with `VERDICT: launched code=0 (strong: commandExited after
  openCommand)` (Raycast 2.11 blocks carry only the code), the paired
  toast shot, and the `mise ls --json` read-back.

## Gotchas

- Never fired in a host so far: a launch removes real installs. The
  `prune()` unit test and the `--dry-run` probe are the proof.
- Typing "Prune Unused Versions" and pressing ⏎ in root search runs it.
- `mise prune` also removes the pruned versions' cache directories, so a
  later reinstall downloads again.
- The success toast shows no summary line; `mise prune` prints per-version
  lines the toast does not parse. That is expected.

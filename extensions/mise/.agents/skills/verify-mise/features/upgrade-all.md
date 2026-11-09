# Upgrade All Tools

Upgrade All Tools (command name `upgrade-all`) is a `no-view` command that
runs `mise upgrade` for every configured tool without opening a window: an
animated toast "Upgrading all tools…" with Cancel and mise's progress lines,
then "All tools upgraded" with mise's summary, or "Upgrading all tools
failed" with a "Copy Logs" action that stays on screen for three seconds.
When it succeeds it re-runs the Tools Menu Bar in the background so the
badge drops. The launch itself mutates mise.

## Sub-features

- `upgrade-all-run` MUTATES. Launching shows "Upgrading all tools…" at once
  (no Raycast window), progress such as `✓ gh@2.101.0 2s` as the message, then
  "All tools upgraded" with mise's summary line. Cancel stops mise and shows
  "Cancelled".
- `upgrade-all-failure` MUTATES (the launch still runs mise). A failing
  `mise upgrade` shows "Upgrading all tools failed" with mise's ERROR line
  and "Copy Logs"; the command waits three seconds so the toast stays.
- `upgrade-all-refresh` MUTATES (follows a run). After a success the Tools
  Menu Bar is re-run in the background.
- `upgrade-all-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The HUD
  "mise not found — set Mise Path in preferences" shows and nothing runs.

## How to get to it (user POV)

- Open Raycast's root search and type "Upgrade All Tools". While `ray
  develop` is running it appears under "Development" with the subtitle
  "Mise". ⏎ runs it.
- Trigger the deeplink `raycast://extensions/lachieh/mise/upgrade-all`
  (what `verify-mise run upgrade-all` does).
- Extension preferences: "Mise Path", "Upgrade Behavior", "Inactive Tools",
  "Parallel Jobs", "Window Behavior", "Debug Logging"; command preference
  "Replaced Versions".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `upgrade-all` has its own "Always Run Command" grant; fire with
  `--timeout 60` so a human can click the alert on the first launch.
- For `upgrade-all-run`: the human asked for it and accepts every configured
  tool being upgraded, with no confirmation and no undo short of `mise use
  -g <tool>@<old>` per tool. `mise outdated --json` run in the same minute.

- **Run (`upgrade-all-run`).** MUTATES; only when asked. `verify-mise run
  upgrade-all --timeout 120` and `verify-mise shot upgrade-all-toast` about
  2s later. The verdict is `launched code=0 (strong: commandExited
  after openCommand)` once mise returns. Read
  back with `mise outdated --json`. For branch verification, prove the line
  from node instead: `runMise(loc, [...upgrade().args, "--dry-run"])` exits
  0 and prints `Would install …` lines.
- **Failure (`upgrade-all-failure`).** Not drivable without a failing mise;
  the `runOperation` unit tests cover the failure toast; the three-second
  hold is untested.
- **Missing mise (`upgrade-all-missing-mise`).** Only with consent to change
  a preference: "Mise Path" → `/nonexistent/mise`, `verify-mise run
  upgrade-all --timeout 60`: the HUD shows and `commandExited { code: 0 }` lands
  within a second. This is the only branch-safe launch of this command.
  Clear the preference after; a cleared preference makes the next launch
  upgrade for real.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/upgrade-all-<seq>.log`
  with `VERDICT: launched code=0 (strong: commandExited after
  openCommand)` (Raycast 2.11 blocks carry only the code), the paired
  toast shot, and the `mise outdated --json` read-back.

## Gotchas

- Never fired in a host so far: every launch upgrades real tools. The
  `upgrade()` unit test and the `--dry-run` probe are the proof.
- Typing "Upgrade All Tools" and pressing ⏎ in root search runs it; do not
  use the keyboard path to "check it is listed".
- `mise upgrade` silently skips tools when GitHub's unauthenticated quota is
  exhausted, so a success toast does not mean every tool moved.
- A `no-view` command runs in a fresh worker, so the "Already running" guard
  does not see an operation started in a view. Do not start two at once.
- Preferences: "Upgrade past the configured range" adds `--bump`, "Include
  inactive tools" adds `--inactive`, "Parallel Jobs" adds `-j <n>`, and
  "Uninstall replaced versions" adds `--prune`, in that order.

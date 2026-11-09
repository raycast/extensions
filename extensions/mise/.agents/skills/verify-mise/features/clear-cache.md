# Clear Cache

Clear Cache (command name `clear-cache`) is a `no-view` command, disabled
by default, that runs `mise cache clear` without opening a window: an
animated toast "Clearing cache…" with Cancel, then "Cache cleared", or
"Clearing cache failed" with a "Copy Logs" action that stays on screen for
three seconds. `mise cache clear` deletes everything under mise's cache
directory (`~/.cache/mise`): downloaded archives, registry and version
listings. Installed tools are untouched. The launch itself mutates mise.

## Sub-features

- `clear-cache-run` MUTATES. Launching shows "Clearing cache…" at once (no
  Raycast window), then "Cache cleared" with no message.
- `clear-cache-failure` MUTATES (the launch still runs mise). A failing
  `mise cache clear` shows "Clearing cache failed" with mise's ERROR line
  and "Copy Logs" for about three seconds.
- `clear-cache-disabled` READ-ONLY. The command ships disabled: it does not
  appear in root search until enabled under Raycast Settings → Extensions →
  Mise.
- `clear-cache-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The HUD
  "mise not found — set Mise Path in preferences" shows and nothing runs.

## How to get to it (user POV)

- Enable "Clear Cache" under Raycast Settings → Extensions → Mise, then open
  root search and type "Clear Cache". While `ray develop` is running it
  appears under "Development" with the subtitle "Mise". ⏎ runs it.
- Trigger the deeplink `raycast://extensions/lachieh/mise/clear-cache`
  (what `verify-mise run clear-cache` does).
- Extension preferences: "Mise Path", "Window Behavior", "Debug Logging".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- The command is enabled in Raycast's extension settings.
- `clear-cache` has its own "Always Run Command" grant; fire with
  `--timeout 60`.
- For `clear-cache-run`: the human asked for it and accepts re-downloading
  every cached archive and listing.

- **Run (`clear-cache-run`).** MUTATES; only when asked. `verify-mise run
  clear-cache --timeout 60` and `verify-mise shot clear-cache-toast` about
  1s later. Read back with `ls ~/.cache/mise` (empty or absent). `mise cache
  clear` has no dry run; the `clearCache()` unit test covers the line.
- **Failure (`clear-cache-failure`).** Not drivable without a failing mise;
  the `runOperation` unit tests cover the failure toast; the three-second
  hold is untested.
- **Disabled by default (`clear-cache-disabled`).** On a fresh install root
  search does not list "Clear Cache". A dev build may already be enabled;
  this is not observable on a machine where it was enabled before.
- **Missing mise (`clear-cache-missing-mise`).** Only with consent to change
  a preference: "Mise Path" → `/nonexistent/mise`, `verify-mise run
  clear-cache --timeout 60`: the HUD shows and `commandExited { code: 0 }` lands
  within a second. Clear the preference after; a cleared preference makes
  the next launch clear the cache for real.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/clear-cache-<seq>.log`
  with `VERDICT: launched code=0 (strong: commandExited after
  openCommand)` (Raycast 2.11 blocks carry only the code), the paired
  toast shot, and the `~/.cache/mise` read-back.

## Gotchas

- Never fired in a host so far, and no dry run exists: the `clearCache()`
  unit test is the only proof of the command line.
- Whether a `disabledByDefault` command answers a deeplink while disabled is
  unverified; enable it first.
- Typing "Clear Cache" and pressing ⏎ in root search runs it.
- A cleared cache makes the next Search Tools, version picker and `mise
  outdated` calls slower while mise refetches listings.

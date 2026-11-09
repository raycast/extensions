# Show Outdated Tools

Show Outdated Tools is a `view` command that lists every tool `mise
outdated` reports as behind, one row per tool with `<current> → <latest>`,
the requested version when it is not `latest`, and the config file that pins
it. From a row the user upgrades that tool or every tool (in Raycast or in
the terminal), opens the release notes, copies the `mise upgrade` line, or
refreshes the list. The command writes the count as its own subtitle in
Raycast's root search ("N outdated", "All up to date") every time the list
loads. When mise cannot be found it shows the shared install screen and the
subtitle reads "mise not found".

## Sub-features

- `show-outdated-list` READ-ONLY. Placeholder "Search outdated tools". One
  row per key of `mise outdated --json` in mise's order (backend prefixes
  such as `npm:wrangler` included): title `<name>`, subtitle `<current> →
  <latest>`; for a row with a pinning config file, a text accessory with the
  requested version unless it is `latest`, and a tag with the file's name.
  Typing filters by name. With nothing outdated the empty view reads "All
  tools up to date" / "Nothing to upgrade".
- `show-outdated-subtitle` READ-ONLY. After the list loads, the command's
  row in root search carries "N outdated" or "All up to date"; every
  refresh rewrites it.
- `show-outdated-release-notes` READ-ONLY. "Open Release Notes" (when mise
  reports a release URL) opens it in the browser; "Copy Upgrade Command"
  copies `mise upgrade <tool>`; ⌘R "Refresh" re-runs `mise outdated`.
- `show-outdated-upgrade` MUTATES. ⏎ "Upgrade" runs `mise upgrade <tool>`
  (range kept): "Upgrading <tool>…" → "<tool> upgraded", the list refreshes
  and the Tools Menu Bar is re-run in the background. ⌘T "Run in Terminal"
  hands the same line to the terminal.
- `show-outdated-upgrade-all` MUTATES. ⌘⇧U "Upgrade All" runs `mise
  upgrade`: "Upgrading all tools…" → "All tools upgraded", then the same
  refresh. ⌘⇧T "Upgrade All in Terminal" hands it to the terminal.
- `show-outdated-launch-upgrade` MUTATES. Launching with context
  `{"upgrade": "<tool>"}` runs `mise upgrade <tool>` once on open (the menu
  bar's tool rows use this); `{"upgrade": "all"}` upgrades every tool.
- `show-outdated-load-error` READ-ONLY. When `mise outdated` fails with no
  cached list, the shared "Couldn't load from mise" empty view with Retry
  and Copy Error replaces the list.
- `show-outdated-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The
  shared Detail, and the subtitle reads "mise not found".

## How to get to it (user POV)

- Open Raycast's root search and type "Show Outdated Tools". While `ray
  develop` is running it appears under "Development" with the subtitle
  "Mise" until the first launch replaces it with the count.
- Trigger the deeplink `raycast://extensions/lachieh/mise/show-outdated`
  (what `verify-mise run show-outdated` does).
- From the Tools Menu Bar: a tool row (context `{"upgrade": "<name>"}`),
  "Upgrade All" (`{"upgrade": "all"}`), or "Open Outdated Tools" (no
  context).
- Extension preferences: "Mise Path", "Terminal Application", "Upgrade
  Behavior", "Inactive Tools", "Parallel Jobs", "Window Behavior", "Debug
  Logging".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `show-outdated` has its "Always Run Command" grant (granted on this
  machine on 2026-11-04; not on any other).
- Run `mise outdated --json` in the same minute as the launch and keep its
  key list; the count moves between runs (see Gotchas).
- The human keeps hands off the machine between `run` and `shot`.
- MUTATES journeys only when the human asked for that journey.

- **Launch and list (`show-outdated-list`).** Run `verify-mise run
  show-outdated --timeout 40` in the background and about 3s later
  `verify-mise shot show-outdated-list`. The shot shows the placeholder,
  rows such as `gh  2.100.0 → 2.101.0  config.local.toml`, and "Upgrade ⏎"
  in the footer. Do not press ⏎.
- **Subtitle (`show-outdated-subtitle`).** The same launch appends
  `updateCommandMetadata called { … entryPointName: "show-outdated" }` to
  Raycast's log, once on mount when a cached list exists (twice in a dev
  build) and again when `mise outdated` returns. To see the text, close the
  view, `focus`, `type "Show Outdated"`, and shot root search.
- **Release notes, copy, refresh (`show-outdated-release-notes`).** ⌘R
  (`key r --cmd`) re-runs the fetch: Raycast's loading bar shows and the
  `updateCommandMetadata` line repeats. "Open Release Notes" moves focus to
  the browser, so drive it last.
- **Upgrade / Upgrade All (`show-outdated-upgrade`,
  `show-outdated-upgrade-all`).** MUTATES; only when asked. Read back with
  `mise outdated --json`. No undo short of `mise use -g <tool>@<old>`. The
  `upgrade()` unit test and the integration suite's `--dry-run` case cover
  the command line.
- **Launch with upgrade context (`show-outdated-launch-upgrade`).** MUTATES
  in general. With consent, `verify-mise run show-outdated --context
  '{"upgrade":"<tool in no config>"}' --timeout 40` is a no-op upgrade.
  Never send `{"upgrade":"all"}`.
- **Missing mise (`show-outdated-missing-mise`).** Only with consent to
  change a preference: "Mise Path" → `/nonexistent/mise`, `run
  show-outdated`, shot; the log carries the `updateCommandMetadata` line.
  Clear the preference and re-run to restore the count.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/show-outdated-<seq>.log`
  with `VERDICT: launched (strong: updateCommandMetadata for show-outdated)`
  (exit 0): `Action performed: Mise: openCommand` followed by the
  `updateCommandMetadata called` block with `entryPointName:
  "show-outdated"`. Observed 2026-11-04 on Raycast 2.11.1 about 4s after
  `openCommand`. No `commandExited` is logged while the view is open. Pair
  it with the shot and the same-minute `mise outdated --json` key list.

## Gotchas

- First grant: the first deeplink showed "Request to run Show Outdated
  Tools" (Run Command, Always Run Command, Cancel), and Raycast logged only
  `Main window reveal skipped` because its window was already up.
  `isShowingAlert: true` appeared about 70s later, when the window lost
  focus. The verdict for that case is exit 5 (window on screen, no
  `openCommand`): look at the screen. The alert vanishes when Raycast loses
  focus, so the human must click it while `run` waits.
- Raycast refuses to run a `view` command in the background (`Background
  refresh not supported for view commands`), so the subtitle updates only
  when this view opens or upgrades. A stale count in root search is not a
  launch failure.
- The list shares its cache with the Tools Menu Bar, so a launch renders the
  menu bar's last result at once and replaces it when `mise outdated`
  returns.
- `mise outdated` asks GitHub for every tool's latest release and draws from
  the unauthenticated quota when mise has no GitHub auth. When it is
  exhausted mise omits the affected tools, so the list and subtitle
  under-count with no visible error. Compare to a `mise outdated --json` run
  in the same minute.
- A cold `mise outdated` took 31s here; take the list shot early (cached
  rows) or wait it out.
- "Upgrade" (⏎) and "Upgrade All" (⌘⇧U) run with no confirmation. Never
  press ⏎ on a row while driving read-only journeys.
- Preferences: "Upgrade past the configured range" adds `--bump` to `mise
  outdated` and every Upgrade, so range-pinned tools appear and get their
  config rewritten. "Include inactive tools" adds `--inactive`; inactive
  rows have no config tag, and because the JSON is keyed by tool name an
  inactive row can replace the active one. Compare against `mise outdated`
  with the same flags.

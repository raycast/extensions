# Tools Menu Bar

Tools Menu Bar (command name `outdated-tools`) is a `menu-bar` command that
sits in the macOS menu bar as an up-arrow with the number of tools `mise
outdated` reports as behind (no number when everything is current),
refreshed every 12 hours or on demand. The menu lists each outdated tool as
`<name>  <current> → <latest>`; choosing one opens Show Outdated Tools and
upgrades that tool there, and "Upgrade All" does the same for every tool.
When `mise outdated` fails the menu says so instead of claiming everything
is current. When mise cannot be found the menu holds one entry, "mise not
found", that opens the extension preferences.

## Sub-features

- `outdated-tools-badge` READ-ONLY. An up-arrow followed by the count; no
  number at 0. Tooltip "mise: N outdated tools". Raycast's loading
  indicator shows while fetching.
- `outdated-tools-list` READ-ONLY. An "Outdated" section with one row per
  tool (title `<name>`, subtitle `<current> → <latest>`, mise's order), or
  the single inert row "All tools up to date". A second section holds
  "Upgrade All" (only when the count is above 0), "Open Outdated Tools" and
  "Refresh".
- `outdated-tools-failure` READ-ONLY. When `mise outdated` fails and there
  is no cached list, the "Outdated" section holds a warning row "Couldn't
  check outdated tools" with mise's last stderr line as its subtitle, and
  clicking it re-runs the check. The tooltip reads "mise: could not check
  outdated tools"; "All tools up to date" is not shown.
- `outdated-tools-open` READ-ONLY. "Open Outdated Tools" opens Show Outdated
  Tools with no context; "Refresh" re-runs `mise outdated`.
- `outdated-tools-open-failure` READ-ONLY (needs Show Outdated Tools
  disabled). When Raycast refuses to open Show Outdated Tools, a failure
  toast "Could not open Show Outdated Tools" carries the error.
- `outdated-tools-upgrade-one` MUTATES. Clicking a tool row opens Show
  Outdated Tools with `{"upgrade": "<name>"}`, which runs `mise upgrade
  <name>` there, then re-runs this command in the background so the badge
  drops.
- `outdated-tools-upgrade-all` MUTATES. "Upgrade All" opens Show Outdated
  Tools with `{"upgrade": "all"}`, which runs `mise upgrade` for every tool.
- `outdated-tools-background-refresh` READ-ONLY. Raycast re-runs the command
  every 12 hours and whenever Show Outdated Tools, Show Installed Tools or
  Upgrade All Tools finishes an upgrade. A run renders the cached list at
  once and replaces it when `mise outdated` returns.
- `outdated-tools-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The
  menu holds one row, "mise not found", whose click opens the extension
  preferences; the tooltip reads "mise not found".

## How to get to it (user POV)

- Click the up-arrow item in the macOS menu bar once the command has been
  activated.
- Open Raycast's root search and type "Tools Menu Bar"; under "Development"
  it shows with the subtitle "Mise". ⏎ activates the menu bar item.
- Trigger the deeplink `raycast://extensions/lachieh/mise/outdated-tools`
  (what `verify-mise run outdated-tools` does).
- The 12-hour interval Raycast registers on activation, and the background
  launch other commands issue after an upgrade.
- Extension preferences: "Mise Path", "Upgrade Behavior" and "Inactive
  Tools" (both change the `mise outdated` flags behind the count).

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `outdated-tools` has its "Always Run Command" grant; fire with `--timeout
  60` the first time on a machine.
- Run `mise outdated --json` in the same minute as the launch and keep its
  key list.
- The human keeps hands off the machine between `run` and `shot`.
- MUTATES journeys only when the human asked for that journey.

- **Badge and rows (`outdated-tools-badge`, `outdated-tools-list`,
  `outdated-tools-open`).** After `up`, run `verify-mise menu
  outdated-tools`. It waits for this build's render, pressing the menu's
  own Refresh item when Raycast has only restored the previous build's
  saved menu, then prints the status item title (the badge, for example
  `' 12'`) and every row, without opening the menu. Compare the tool rows
  with the same-minute `mise outdated --json`. `verify-mise shot
  outdated-tools-item --menubar` captures the status item itself, a
  Control Center window named `c:n:lachieh/mise::-::outdated-tools`.
  Never click a tool row or "Upgrade All" without the human asking.
- **Failure row (`outdated-tools-failure`).** Needs a failing `mise
  outdated` (an exhausted GitHub quota makes mise omit tools rather than
  fail), so it is normally proven by the component test.
- **Open failure (`outdated-tools-open-failure`).** Only with consent to
  disable Show Outdated Tools in Raycast's extension settings: click "Open
  Outdated Tools" and shoot the failure toast. Re-enable it afterwards.
- **Upgrade one / all (`outdated-tools-upgrade-one`,
  `outdated-tools-upgrade-all`).** MUTATES; only when asked. The hand-off is
  the Show Outdated Tools launch-context path; read back with `mise outdated
  --json`.
- **Background refresh (`outdated-tools-background-refresh`).** After an
  approved upgrade, Raycast's log shows a new `commandExited` block with no
  matching `open` from verify-mise (on Raycast 2.11 the block names no
  command, so attribute it by timing only). The schedule shows as `Scheduling task started { …,
  commands: "dev_/lachieh/mise/outdated-tools:43200000" }` on first
  activation (not yet observed for the 12-hour interval).
- **Missing mise (`outdated-tools-missing-mise`).** Only with consent to
  change a preference: "Mise Path" → `/nonexistent/mise`, `run
  outdated-tools --timeout 60`, then the human opens the menu. Clear the
  preference and re-run.
- **Proof.** `artifacts/<run-id>/ax/<name>.txt` from `menu`, which only
  prints after this build's render (`Menu bar: unloading worker` for
  `::-::outdated-tools` with `reason: "render-completed"`, logged after
  `up`), plus the same-minute `mise outdated --json` key list. A `run
  outdated-tools` gives `launched code=0 (strong: commandExited for
  outdated-tools)` when Raycast does run it, but right after `up` it often
  logs nothing (`not launched`): Raycast restores the saved menu instead.

## Gotchas

- On an older Raycast a menu-bar launch logged `commandExited { code: 0,
  entryPoint: "dev_/lachieh/mise/outdated-tools" }` 5–17s after firing, once
  the fetch settled (the item stays in the menu bar). Raycast 2.11 drops
  `entryPoint` from these blocks, and also logs `{ code: 0 }` blocks when
  `ray develop` installs or refreshes the extension. The first activation also logs
  `Scheduling task started …` and `Init menu bar extra controller`.
  `Action performed: Mise: openCommand` is not reliably logged; do not wait
  for it.
- Activating the command adds the item to the user's menu bar; that is a
  Raycast change, not a mise one, but tell the human.
- `mise outdated` draws from GitHub's unauthenticated quota (60 an hour per
  IP) when mise has no GitHub auth. When it is exhausted mise omits tools,
  so the badge under-counts with no visible error. Compare to a same-minute
  `mise outdated --json`.
- While the item has never been activated, post-upgrade refreshes log
  `Skipping launchCommand for inactive menu bar command`.
- macOS hides menu bar extras when the bar is full, so a missing item is not
  proof of a failed launch; pair the shot with the log.
- Preferences: "Upgrade past the configured range" and "Include inactive
  tools" add `--bump` and `--inactive` to the `mise outdated` behind the
  badge, so the count can be far higher than a plain `mise outdated --json`
  (49 against 3 here with both on); compare with the same flags.

# Show Installed Tools

Show Installed Tools (command name `installed-tools`) is a `view` command
that lists every tool present in `mise ls`, split into "Active" (a version
is in use through some config file) and "Inactive". Each row shows the
active version, how it was requested when that differs (`lts → 24.21.0`),
how many versions are installed and which config file activated it. From a
row the user sets the global version from `mise ls-remote`, upgrades within
the configured range, uninstalls one version after a confirmation, hands
the upgrade to the terminal, reveals the install directory in Finder or
copies its path. When mise cannot be found it shows the shared install
screen.

## Sub-features

- `installed-tools-list` READ-ONLY. Placeholder "Search installed tools".
  "Active" then "Inactive" with counts in the headers; rows show name,
  version subtitle (`requested → version` when they differ), an "N versions"
  accessory when more than one is installed, and a tag with the activating
  config file's name. Typing filters by name and version. With nothing
  installed the empty view reads "No installed tools" / "Add one from Search
  Tools".
- `installed-tools-detail` READ-ONLY. ⌘I "Toggle Details" shows every
  installed version with `(active)`, the requested version, the install path
  and the source config path.
- `installed-tools-version-picker` READ-ONLY. ⏎ "Set Global Version…"
  pushes "Set Global Version — <tool>": every version `mise ls-remote
  <tool>` knows, newest first, installed ones with a check icon, the active
  one tagged "active", each with its release date. Typing filters versions.
  "Open Release Notes" appears when mise has a release URL.
- `installed-tools-install-target` READ-ONLY to view. The picker's search bar
  carries the same "Install to" dropdown as Search Tools ("mise default"
  then every `mise config ls` file, stored across launches, "mise default"
  alone when listing fails).
- `installed-tools-set-global` MUTATES. In the picker, ⏎ "Set as Global
  Version" runs `mise use -g <tool>@<version>` (or `--path <file>` for a
  chosen file): "Adding <tool>…" → "<tool> added", then the picker pops and
  the list refreshes. ⌘⇧⏎ "Use Globally in…" picks a file for one install.
  ⌘T "Run in Terminal" hands the same line to the terminal. A low-downloads
  refusal offers "Allow Low Downloads and Retry" as in Search Tools.
- `installed-tools-upgrade` MUTATES. "Upgrade" runs `mise upgrade <tool>`,
  keeping the configured range: "Upgrading <tool>…" → "<tool> upgraded",
  the list refreshes and the Tools Menu Bar is re-run in the background. ⌘T
  "Run in Terminal" on a row hands the same `mise upgrade` to the terminal.
- `installed-tools-uninstall` MUTATES. ⌃X opens "Uninstall Version…" with
  one destructive entry per installed version. Choosing one shows
  "Uninstall <tool>@<version>?" with a destructive "Uninstall" button; on
  confirm, "Uninstalling <tool>@<version>…" → "<tool>@<version>
  uninstalled", and the version leaves the row.
- `installed-tools-reveal` READ-ONLY. "Show in Finder" opens the active
  (else newest) version's install directory; "Copy Install Path" copies it.
- `installed-tools-launch-upgrade` MUTATES. Launching with context
  `{"upgrade": "<tool>"}` runs `mise upgrade <tool>` once on open; `{"upgrade":
  "all"}` upgrades every tool. The list shows underneath and refreshes when
  it finishes.
- `installed-tools-load-error` READ-ONLY. When `mise ls` fails with no cached
  list, or `mise ls-remote` fails in the picker, the shared "Couldn't load
  from mise" empty view with Retry and Copy Error replaces the list.
- `installed-tools-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The
  shared "mise was not found" Detail.

## How to get to it (user POV)

- Open Raycast's root search and type "Show Installed Tools". While `ray
  develop` is running it appears under "Development" with the subtitle
  "Mise".
- Trigger the deeplink `raycast://extensions/lachieh/mise/installed-tools`
  (what `verify-mise run installed-tools` does).
- The same deeplink with `?context=<url-encoded JSON>` carrying `{"upgrade":
  "<tool>"|"all"}` (what `verify-mise run installed-tools --context '...'`
  sends). Nothing in the extension issues it any more; the menu bar hands
  off to Show Outdated Tools.
- Extension preferences: "Mise Path", "Terminal Application", "Upgrade
  Behavior", "Inactive Tools", "Uninstall Behavior", "Parallel Jobs", "Show
  Installed Tools List", "Window Behavior", "Debug Logging".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `installed-tools` has its "Always Run Command" grant; the first `run` on a
  machine may report `grant required`, so fire with `--timeout 60` with a
  human ready.
- The human keeps hands off the machine between `run` and `shot`.
- MUTATES journeys only when the human asked for that journey.

- **Launch and list (`installed-tools-list`).** Run `verify-mise run
  installed-tools --timeout 60` in the background and about 1.5s later
  `verify-mise shot installed-tools-list`. The shot shows the placeholder
  "Search installed tools", an "Active" header whose count equals the
  `mise ls --json` keys with an `active: true` entry, rows such as `node  lts
  → 24.21.0  8 versions  tools.toml`, and "Set Global Version… ⏎" in the
  footer.
- **Detail pane (`installed-tools-detail`).** With the list showing,
  `verify-mise key i --cmd` then `shot installed-tools-detail`: versions with
  `(active)`, install paths and `from <config path>` lines.
- **Version picker (`installed-tools-version-picker`,
  `installed-tools-install-target`).** `type "jq"`, `key return`, wait 2–3s,
  `shot installed-version-picker`: the navigation title "Set Global Version
  — jq", versions newest first with installed ones checked, and the "Install
  to" dropdown at the search bar's right edge. Leave with `key escape`;
  never ⏎ on a version unless the human asked.
- **Set global version (`installed-tools-set-global`).** MUTATES; only when
  asked. Copy the target config first; pick a throwaway version, ⏎, watch
  "Adding <tool>…" → "<tool> added", read back `mise ls <tool> --json` and
  `diff` the config. Undo with `mise unuse -g <tool>@<version>` (or `--path
  <file>`). The command line is proven without mutation by the
  `addGlobally` `--dry-run` node probe (see Search Tools).
- **Upgrade (`installed-tools-upgrade`).** MUTATES; only when asked, on a
  tool `mise outdated --json` lists. No undo short of `mise use -g
  <tool>@<old>`. The `upgrade()` unit test covers the line.
- **Uninstall (`installed-tools-uninstall`).** MUTATES; only when asked. The
  READ-ONLY part: ⌃X (`key x --ctrl`) opens the submenu and a shot shows one
  entry per version; `key escape` closes it without running anything.
- **Reveal (`installed-tools-reveal`).** "Show in Finder" opens a Finder
  window at the install path; driving it needs the action panel (`key k
  --cmd`, type "Show in Finder", `key return`) and moves focus to Finder.
- **Launch with upgrade context (`installed-tools-launch-upgrade`).**
  MUTATES in general. With the human's consent, `verify-mise run
  installed-tools --context '{"upgrade":"<tool>"}' --timeout 60` for a tool
  in no config is a no-op upgrade ("<tool> upgraded", nothing changes).
  Never send `{"upgrade":"all"}`.
- **Missing mise (`installed-tools-missing-mise`).** Only with consent to
  change a preference: "Mise Path" → `/nonexistent/mise`, `run
  installed-tools`, shot, then clear it.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/installed-tools-<seq>.log`
  with `VERDICT: launched (weak: openCommand only …)` (exit 4) unless "Debug
  Logging" is on, in which case its mise calls in `ray-develop.log` make it
  `launched (strong: extension console output …)`; plus the paired shot,
  which carries the per-command part of a weak verdict. Report a weak
  verdict as weak.

## Gotchas

- `mise install`/`mise uninstall` leave config alone; `mise use` and `mise
  unuse` rewrite a config file (`~/.config/mise/config.local.toml` or the
  dropdown's file), so copy it before and `diff` after any approved mutation.
- The "Install to" dropdown stores its value across launches; check it
  before assuming a version lands in the default file.
- "Upgrade" keeps the configured range (`node@lts` stays `lts`) unless
  "Upgrade past the configured range" is on, which adds `--bump` and
  rewrites the config.
- The version picker calls `mise ls-remote`, which hits the network and can
  take a few seconds cold (node has hundreds of versions); it is cached per
  tool afterwards.
- `mise ls <tool> --json` returns an array, unlike the keyed object of `mise
  ls --json`.
- In Raycast 2.11 a view logs no `commandExited` while it is open, and this
  view emits no per-command log line of its own, so without "Debug Logging"
  `run` waits the full timeout and ends with the weak verdict (exit 4). Run
  `run` in the background and take the shot while it waits.
- The post-upgrade menu bar refresh logs `Skipping launchCommand for
  inactive menu bar command` while the Tools Menu Bar has never been
  activated on the machine.
- Preferences: "Show inactive tools in Show Installed Tools" (on by default)
  removes the whole Inactive section when off, so a missing section is not a
  parse failure. "Include inactive tools" adds `--inactive` to Upgrade and
  the upgrade context. "Parallel Jobs" adds `-j <n>` to Upgrade and Set
  Global Version. "Remove the tool
  from config when uninstalling a configured version" switches Uninstall to
  `mise unuse --path <config> <tool>@<requested>` for a version a config
  requests (the alert adds "Also removes <tool> from <file>").

# Search Tools

Search Tools is a `view` command that lists mise's registry (about a
thousand tools) with the tools already present in `mise ls` grouped first
under "Installed", each row tagged with its backend and installed versions.
The extension filters the list itself as the user types. A query with a
backend prefix (`npm:prettier`, `cargo:ripgrep`, `gem:rubocop`,
`pipx:black`, `github:cli/cli`) adds a section of results from that backend
so packages outside the registry can be installed. The primary action on an
uninstalled row adds it to a global mise config; on an installed row it is
"Remove <name>…". When mise cannot be found it shows an install screen
instead of a list.

## Sub-features

- `search-tools-list` READ-ONLY. Placeholder "Search tools or npm:, cargo:,
  gem:…". With an empty query, "Installed" lists every installed registry
  tool and "Registry" the first 100 others with the subtitle "100 of N".
  Rows show name, description (hidden while the detail pane is open), a
  backend tag (`aqua`, `core`, `npm`, ...) and, when installed, the version
  list with a check icon.
- `search-tools-filter` READ-ONLY. Typing filters in the extension, not in
  Raycast: an exact name ranks first, then a name prefix, then an alias or
  bin prefix, then a substring of name, alias, bin or description; the top
  50 matches split into "Installed" and "Registry" (no "of" subtitle). With
  no match the empty view reads "No tools match" / "Try a bin name, an
  alias, or a backend prefix".
- `search-tools-backend-query` READ-ONLY. Typing `<backend>:<name>` adds a
  "<backend> results" section first, 250ms after typing stops (earlier
  requests are aborted). `npm:`, `cargo:` and `gem:` search their package
  index (up to 20 rows with description and newest version); every other
  backend (`pipx:`, `github:`, `go:`, `ubi:`, ...) shows one row for the
  exact spec when `mise ls-remote` knows it, or nothing. Rows for a spec in
  `mise ls` carry the installed versions. "Open Package Page" opens
  npmjs.com, crates.io, rubygems.org, github.com or pypi.org. With no
  results the empty view reads "No <backend> packages match" / "Check the
  package name". A failed search shows a failure toast and the section
  empties; the previous query's rows are not kept.
- `search-tools-detail` READ-ONLY. ⌘I "Toggle Details" shows a pane with
  description, Bins, Backends and Aliases (backend rows: Backend and
  Version) and an "Installed" section listing versions, `(active)` marked,
  or "Not installed". The "Details" command preference opens with it
  showing.
- `search-tools-install-target` READ-ONLY to view; selecting a file only
  changes where later installs go. An "Install to" dropdown at the right of
  the search bar lists "mise default" then every config file from `mise
  config ls`, labelled relative to `~/.config/mise/` (`config.local.toml`,
  `conf.d/tools.toml`) or by file name. It appears only once those files
  load and remembers its choice across launches. When `mise config ls`
  fails it shows "mise default" alone without overwriting the stored
  choice, and a failure toast reports the error.
- `search-tools-use-globally` MUTATES. ⏎ "Use Globally" on an uninstalled
  row runs `mise use -g <spec>@latest`, or `mise use --path <file>
  <spec>@latest` when the dropdown names a file. Toast "Adding <spec>…" →
  "<spec> added" (with "→ <file label>" for a chosen file), and the row
  moves to "Installed". ⌘⇧⏎ "Use Globally in…" is a submenu of the same
  files that installs into the chosen one without touching the dropdown.
  "Copy Install Command" copies `mise use -g <spec>` (READ-ONLY).
- `search-tools-low-downloads` MUTATES. When mise refuses an npm package
  under its weekly-download threshold, the failure toast "Adding <spec>
  failed" carries "Allow Low Downloads and Retry" as its primary action,
  which re-runs the same use with `--tool-option allow_low_downloads=true`;
  "Copy Logs" moves to the secondary action.
- `search-tools-remove` MUTATES. On an installed row the first action is
  "Remove <name>…" (trash icon, destructive). It confirms with "Remove
  <name>?": "Removes <name> from your mise config and deletes N installed
  version(s)." when a config declares it, else "Deletes N installed
  version(s).". Confirming runs `mise unuse <name>` then `mise uninstall
  --all <name>` (configured) or `mise uninstall --all <name>` alone. Toast
  "Removing <name>…" → "<name> removed"; the row loses its versions and its
  primary action is Use Globally again. Cancelling runs nothing.
- `search-tools-run-in-terminal` MUTATES. ⌘T "Run in Terminal" opens the
  terminal running the same `mise use` line Use Globally would run.
- `search-tools-links` READ-ONLY. "Open Documentation" (registry rows) opens
  `mise.jdx.dev/lang/<tool>.html` for core tools and the registry page for
  the rest; "Open Package Page" (backend rows) as above.
- `search-tools-load-error` READ-ONLY. When `mise registry` fails with no
  cached list, the shared "Couldn't load from mise" empty view with Retry
  and Copy Error replaces the list.
- `search-tools-missing-mise` READ-ONLY (needs a bogus "Mise Path"). The
  shared "mise was not found" Detail.

## How to get to it (user POV)

- Open Raycast's root search and type "Search Tools". While `ray develop`
  is running it appears under "Development" with the subtitle "Mise".
- Trigger the deeplink `raycast://extensions/lachieh/mise/search-tools`
  (what `verify-mise run search-tools` does).
- The same deeplink with `?fallbackText=<url-encoded text>` opens with the
  search bar filled, which also runs the backend search for a prefixed
  query.
- Extension preferences: "Mise Path", "Terminal Application", "Parallel
  Jobs" (adds `-j <n>` to `mise use`), "Window Behavior", "Debug Logging";
  command preference "Details".

## Driving it with verify-mise

Preconditions:

- `verify-mise doctor` exits 0.
- `search-tools` has its "Always Run Command" grant; if `run` says `grant
  required`, a human clicks it while `run search-tools --timeout 60` is
  firing.
- The human keeps hands off the machine between `run` and `shot`; Raycast
  hides the instant another app becomes active.
- MUTATES journeys only when the human asked for that journey.

- **Launch and list (`search-tools-list`).** Run `verify-mise run
  search-tools --timeout 60` in the background, then within about two
  seconds `verify-mise shot search-tools-list`. The shot shows the
  placeholder "Search tools or npm:, cargo:, gem:…", an "Installed" header
  whose count matches the registry names among `mise ls --json` keys, a
  "Registry" header reading "100 of N", and in the footer "Use Globally ⏎"
  or, on an installed row, "Remove <name>… ⏎". Observed 2026-09-17:
  "Installed 39" with tags and versions.
- **Filter (`search-tools-filter`).** With the list showing, `verify-mise
  type "rg"` then `shot search-tools-filter`: `ripgrep` (bin `rg`) is among
  the first rows. Type `zzzzqq` for the "No tools match" empty view.
- **Backend query (`search-tools-backend-query`).** `verify-mise mark`, then
  `open "raycast://extensions/lachieh/mise/search-tools?fallbackText=npm%3Aprettier"`,
  about 2.5s later `verify-mise shot backend-search-npm`, then `verify-mise
  await search-tools --timeout 20`. The shot shows `npm:prettier` in the
  search bar and an "npm results 20" section led by `npm:prettier` with an
  `npm` tag and a version (observed 2026-09-17). Do not press ⏎ on a backend
  row.
- **Detail pane (`search-tools-detail`).** With the list showing,
  `verify-mise key i --cmd` then `verify-mise shot search-tools-detail`:
  the right pane shows the selected tool's heading, Bins/Backends/Aliases and
  "Installed".
- **Install target (`search-tools-install-target`).** Launch as for the list
  and `shot install-target-dropdown` about 3s later: the search bar's right
  edge shows the dropdown, reading "mise default" or the stored file. Its
  items match `mise config ls --json` paths. Opening the dropdown needs a
  click from the human.
- **Use Globally (`search-tools-use-globally`).** MUTATES; only when asked.
  Copy the target config first. From the list, type a throwaway tool, press
  ⏎, and watch "Adding <tool>…" → "<tool> added". Read back with `mise ls
  <tool> --json` (`source.path` names the file) and `diff` the config. Undo
  with `mise unuse -g <tool>@<version>` (or `--path <file>`). Without the
  human, prove the line from node: `addGlobally("jq", "1.7.1", {
  configFile })` through `runMise` with `--dry-run` appended prints `mise
  would update <file> (add: jq@1.7.1)`.
- **Low-downloads retry (`search-tools-low-downloads`).** MUTATES; only when
  asked. Needs an npm package under mise's download threshold. Unit tests
  cover the retry; `mise use -g --dry-run --tool-option
  allow_low_downloads=true npm:<pkg>` proves mise accepts the option.
- **Remove (`search-tools-remove`).** MUTATES; only when asked. The READ-ONLY
  part is the footer: an installed row shows "Remove <name>… ⏎" in a list
  shot. Pressing it opens the confirmation; pressing Cancel (`key escape`)
  is safe and runs nothing. Confirming deletes every installed version of the
  tool.
- **Load error (`search-tools-load-error`).** Not drivable without breaking a
  mise call; the component test covers it. It was observed once with a
  temporary `--bogus` flag in the registry call (warning empty view, "For
  more information, try '--help'.", Retry in the footer, no toast).
- **Missing mise (`search-tools-missing-mise`).** Only with the human's
  consent to change a preference: set "Mise Path" to `/nonexistent/mise`,
  `run search-tools`, `shot search-tools-missing`; the Detail lists that
  one path. Clear the preference afterwards.
- **Proof.** Evidence file
  `.agents/skills/verify-mise/artifacts/<run-id>/commands/search-tools-<seq>.log`
  with `VERDICT: launched (weak: openCommand only …)` (exit 4) unless "Debug
  Logging" is on, in which case its mise calls in `ray-develop.log` make it
  `launched (strong: extension console output …)`; plus the paired shot,
  which carries the per-command part of a weak verdict. Report a weak
  verdict as weak.

## Gotchas

- In Raycast 2.11 a view logs no `commandExited` while it is open, and this
  view emits no per-command log line of its own, so without "Debug Logging"
  `run` waits the full timeout and ends with the weak verdict (exit 4). Run
  `run` in the background and take the shot while it waits.
- Raycast hides as soon as another app becomes active; a shot 4s after `run`
  captured only the terminal, 1.8s worked.
- The primary action differs by row: ⏎ on an installed row is "Remove
  <name>…", not Use Globally. Never press ⏎ on an installed row while
  driving read-only journeys; read the footer from a shot instead.
- `mise ls --json` keys carry backend prefixes (`npm:wrangler`); those never
  match a registry name, so they are not in "Installed". They do show as
  installed under a backend query for the same spec.
- A prefixed query such as `npm:prettier` is also run through the registry
  filter, which normally leaves "Installed" and "Registry" empty.
- Backend queries need the network: `npm:` hits registry.npmjs.org, `cargo:`
  crates.io (sent with User-Agent `raycast-mise`), `gem:` rubygems.org, and
  every other backend runs `mise ls-remote <spec>`, which for `github:`,
  `ubi:` and `spm:` calls api.github.com under its unauthenticated rate
  limit. A 403 there shows the failure toast, not "No packages match".
- Backends other than npm, cargo and gem only validate the exact spec;
  `pipx:bla` shows nothing until `pipx:black` is typed, and `pipx:` alone
  shows no backend section.
- The "Install to" dropdown stores its value: a file picked in an earlier
  launch is selected again, so check it before assuming "mise default". It
  stays hidden until `mise config ls` returns.
- `--path` and `-g` are exclusive on `mise use`. A `conf.d` file loads
  before `config.local.toml`, so a tool written to `conf.d/` can be shadowed;
  read back `source.path` in `mise ls <tool> --json`, not just the toast.
- `open`'s exit code is 0 whether or not Raycast did anything with the URL.
- `ray-develop.log` is UTC-timestamped; Raycast's own log is local time.
  Correlate by the appended-lines window, not by clock.
- Every checkout of this extension shares the `lachieh/mise` dev slot; the
  extension on screen is whichever checkout `ray develop` last built. Check
  the `target:` line.

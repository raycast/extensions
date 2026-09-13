# Switcheroo Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Manage Switcheroo keyboard remapper configuration directly from Raycast.

- **View Remaps** — list and manage all configured keyboard remapping rules.

- **Add Remap** — create a new keyboard remapping rule from Raycast.

- **Restart Switcheroo** — restart the Switcheroo service (auto-detects Homebrew
  and standalone install layouts and refuses ambiguous/foreign jobs).

- **View Logs** — view recent Switcheroo log output.

- **Edit Config** — open the Switcheroo configuration file in your default editor.

- Supports the Switcheroo daemon installed independently via Homebrew
  (`brew install switcheroo`) or the standalone `install.sh` script. The daemon
  is not bundled with this extension and must be installed separately.
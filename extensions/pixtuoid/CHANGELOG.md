# Pixtuoid Changelog

## [Failures Say Why] - {PR_MERGE_DATE}

- **Manage Sources** — a failed connect or disconnect shows its reason, not a bare "failed".
- **Manage Sources** — output this version can't read is an error, never a wrong list.
- **Manage Sources** — disconnecting removes the hooks or plugin pixtuoid installed for that CLI.
- **Start Floating Window** — waits until the window opens, and shows why when it can't (a config error, no GPU adapter).
- **Start Floating Window** — needs pixtuoid 0.23.0 or later, and says so on an older one.

## [Initial Version] - 2026-07-22

- **Manage Sources** — list every agent CLI Pixtuoid knows about and connect/disconnect each one (over `pixtuoid sources --json` + `pixtuoid connect|disconnect`).
- **Start Floating Window** — open the Pixtuoid floating desktop window.
- Auto-detects the `pixtuoid` binary (login-shell PATH → Homebrew / Cargo / `~/.local/bin`), with a binary-path preference override.

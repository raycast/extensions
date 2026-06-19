# Pixtuoid Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Manage Sources** — list every agent CLI Pixtuoid knows about and connect/disconnect each one (over `pixtuoid sources --json` + `pixtuoid connect|disconnect`).
- **Start Floating Window** — open the Pixtuoid floating desktop window.
- Auto-detects the `pixtuoid` binary (login-shell PATH → Homebrew / Cargo / `~/.local/bin`), with a binary-path preference override.

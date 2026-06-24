# Tana Changelog

## [Local MCP workspace experience] - 2026-06-22

- Added typed local MCP health, discovery, tool calls, error classification, and privacy-safe Diagnostics.
- Added workspace-aware Quick Add, Today capture, Tana search, node reading, child browsing, and node actions.
- Added `Open in Tana`, `Open in Tana Panel`, and `Open in Tana Tab` actions with a best-effort Tana Desktop foreground jump.
- Added `Add Note to This Node` from Browse Children.
- Added search-based pinned targets and real Supertag schema management.
- Added guarded edit, move, Trash, capability compatibility, unit tests, and CI.
- Removed the old requirement to manually register Supertag IDs in Raycast.
- Added final audit archive and a user-facing product guide.
- Localized the product guide to Chinese, fixed nested Raycast draft warnings, and upgraded lint tooling dependencies so `npm audit` reports 0 vulnerabilities.
- Prepared a public Store release branch with private audit archives removed and a repeatable Store preflight check.

## [Custom supertags and target nodes] - 2024-01-20

Support has been added for custom supertags and custom target nodes.

You can now define supertags via the **Manage Supertags** command, which will submit the note with
the configured supertags. In addition, target nodes may be defined via the **Manage Target Nodes**
command which allow you to submit notes to any node in your workspace. Previously, only `Inbox`
was supported.

See the README for instructions.

## [Fix Compatibility Issues] - 2023-12-08

- Fix 401 error when add note.
- Use `TextField` instead of `TextArea`.
- If you have used this plugin before, you need to update the API token according to the steps mentioned in the [README](./README.md).

## [Initial Version] - 2022-11-25

Initial version code

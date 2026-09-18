# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately through [GitHub Security Advisories](../../security/advisories/new) rather than in a public issue. Please include the macOS version, the application you were uninstalling, and the path that was handled incorrectly.

## Threat model

This extension deletes files on behalf of the user. The risks worth reasoning about are:

| Risk | Mitigation |
| --- | --- |
| A file is attributed to the wrong application | Weak evidence is never pre-selected; contested files are demoted and labelled; every row states its reason |
| A path outside the intended directories is removed | An allow-list of roots with per-root depth limits, enforced in `safety.ts` |
| A symlink redirects a deletion | The parent of every path is resolved before the check; a path that leaves its root is refused |
| A filename is interpreted as a command | No shell is ever invoked; all external calls use `execFile` with an argument list |
| A mistake is unrecoverable | Nothing is deleted outright — items are moved to the Trash |
| Privilege escalation | Only on an explicit, separate action over an explicit selection, and only through `do shell script … with administrator privileges` — macOS presents its own password dialog and the extension never sees the credential. Paths are validated once more immediately before root acts, and the whole batch is refused if any one of them fails |
| An unsure match reaching the privileged path | Low-confidence items are never pre-selected, including those needing administrator rights, and the privileged action removes only what is selected — it lists every path in the confirmation before asking for a password |
| Overwriting something already in the Trash | A privileged move targets a new, empty folder created for that uninstall, so `mv -f` has nothing to overwrite |
| A path being injected into a privileged command | No path is interpolated into the AppleScript. Paths arrive as `argv` and are quoted by `quoted form of`, so a name containing spaces, quotes, `$(…)` or `;` reaches `mv` as one literal argument; `--` stops a leading dash being read as an option |
| Data leaving the machine | No network access and no telemetry |
| Reading the TCC database to report permission status | Read-only, one constant query with nothing interpolated into it, restricted to the rows for `kTCCServiceSystemPolicyAppBundles`; no other service, app or field is read, and nothing is written |

## Invariants

These are the properties the code is meant to guarantee. A change that breaks one is a security bug.

1. `checkRemovable` is the only gate on removal, and `moveToTrash` re-runs it immediately before acting — a scan result is never trusted on its own.
2. No path outside `APP_ROOTS` or `SEARCH_ROOTS` in `locations.ts` can be removed.
3. No search root can be removed, and nothing deeper than its declared `depth`.
4. Both the literal path and the path with its parent resolved must lie inside the same root.
5. Nothing matching `com.apple.*` or the protected names in `safety.ts` is removable at any depth.
6. A directory shared by several applications is not removable; only an application's own folder inside it is.
7. The process never opens a network connection. It escalates privileges only when the user chooses the administrator action and authenticates to macOS itself, never silently and never as a fallback from a failed removal.
8. Installer receipts are never moved as files. `pkgutil` keeps a database alongside them, so they are cleared with `pkgutil --forget` and `/private/var/db/receipts` is not a search root at all.
9. The TCC database is only ever opened read-only, and only to answer whether Raycast itself holds App Management. Reporting a permission accurately is the sole reason to read it; if it cannot be read, the answer is `unknown`, never an assumption.

Invariants 2–6 are covered by `tests/safety.test.ts`. `tests/elevate.test.ts` covers the privileged path specifically: every unsafe path is rejected before anything escalates, so no authentication dialog can be raised for a path that would then be refused.

## Scope

Out of scope: the user deliberately selecting an "Unsure" item and it turning out to belong to another app. The extension labels the uncertainty and the Trash makes it reversible; deciding is the user's.

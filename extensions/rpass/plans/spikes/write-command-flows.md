# Spike: Raycast write flows for future rpass commands

## Current Raycast surface

The extension currently exposes one Raycast command from `package.json`: `vault`. It opens a read-only browser for entries in a pass-compatible store. Current actions let users show an entry, copy or paste row values, refresh TOTP codes, and retry errors. Preferences configure the `rpass` executable path, password store path, default copy/paste action, and clipboard timeout.

## Shared integration rules

All future write flows must preserve the `rpass` CLI safety contract:

- Use entries without the `.gpg` suffix, e.g. `example/login`.
- Use JSON output/error contracts when the CLI supports them.
- Never pass passphrases as `--passphrase <value>`.
- Use `--passphrase-stdin` for non-interactive passphrase flows.
- Show structured CLI errors to the user and keep Copy Error/Retry actions where useful.
- Use dummy data in tests only.

## `rpass generate <entry> <length>`

### User story

A user wants to create a new password entry from Raycast without leaving the launcher.

### Candidate Raycast UI

Start with a separate command or an action from the vault list named `Generate Password`. A form should include:

- entry path, e.g. `example/login`;
- password length;
- optional force/overwrite toggle only if the CLI supports safe overwrite behavior;
- submit action.

### CLI contract needed

The extension should wait for a stable CLI command with JSON success/error output. The CLI must preserve encrypted write safety: temporary output in the destination directory, GPG success before replacing the final `.gpg` file, and recipients from the nearest `.gpg-id`.

### Tests before implementation

- Client contract tests for argv construction and JSON error parsing.
- UI form validation tests if a Raycast test strategy exists; otherwise manual checklist.
- Regression that `--passphrase <value>` never appears in argv.

### Recommendation

Implement this first among write flows because it is least destructive, but only after the Rust CLI command exists with a stable JSON contract.

## `rpass rm <entry>`

### User story

A user wants to remove a vault entry from Raycast.

### Candidate Raycast UI

Expose as an entry action, not a default action. Require explicit confirmation that includes the entry path. Prefer a destructive Raycast action style and require a second confirmation or exact entry-name input if the CLI does not provide a safe confirmation mechanism.

### CLI contract needed

The CLI should support JSON success/error output and a clear force/confirm behavior. It must distinguish missing entries from successful deletion.

### Tests before implementation

- Client tests for missing entry, success, and user cancellation where applicable.
- Manual check that delete is not the default/primary action.
- Confirmation text includes the exact entry path.

### Recommendation

Do not implement until `generate` is complete and the CLI's destructive behavior is stable.

## `rpass mv <old-entry> <new-entry>`

### User story

A user wants to rename or move an entry between folders from Raycast.

### Candidate Raycast UI

Expose as an entry action. Form fields:

- old entry path, prefilled and read-only if launched from an entry;
- new entry path;
- overwrite toggle only if supported by CLI;
- confirmation when moving across recipient boundaries.

### CLI contract needed

The CLI must define overwrite policy, parent directory creation, directory cleanup, and recipient behavior when moving between folders with different `.gpg-id` files. JSON errors should distinguish destination-exists, missing source, invalid entry name, missing recipients, and GPG failure.

### Tests before implementation

- Client tests for argv and JSON errors.
- Manual tests for same-folder rename and cross-folder move.
- Safety tests in the CLI repo should prove existing entries are preserved on failed re-encryption.

### Recommendation

Implement last among Phase 2 write flows because it touches paths, overwrite policy, directories, and recipients.

## Recommended follow-up

1. Add a `rpass generate` client method and contract tests once the CLI command is available.
2. Add a Raycast `Generate Password` form behind that client method.
3. Design and implement `rm` with destructive confirmation.
4. Design and implement `mv` only after overwrite and recipient semantics are fully documented by the CLI.

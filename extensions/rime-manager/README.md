# Rime Manager

A local-first Raycast extension for managing Rime on macOS. It detects the Rime user data directory and installed schemas without depending on a specific configuration distribution.

[Chinese documentation](README.zh-CN.md)

## Features

- Deploy Rime configuration changes
- Sync Rime user dictionaries and configuration
- Pin candidates already produced by any detected schema
- Block candidates so they no longer appear
- Demote candidates only when they enter the top three, without removing them
- Keep saved candidate text and input codes hidden until local macOS authentication succeeds
- Search installed applications and configure per-app `ascii_mode`, punctuation, preedit, and Vim mode
- Open Rime files and Squirrel logs
- Create full backups and automatic snapshots before configuration writes
- Open Raycast extension preferences from the main management command

## Rime Compatibility

The extension scans every `*.schema.yaml` file and reads each schema ID and display name. It uses `default.yaml`, `default.custom.yaml`, and `user.yaml` to identify enabled and recently selected schemas.

Compatibility is capability-based rather than distribution-based:

- If a schema already contains `lua_filter@*pin_cand_filter`, the extension appends rules through `pin_cand_filter/+`.
- Otherwise, the extension installs its own pinning filter and patches only `<schema_id>.custom.yaml`.
- If an existing `blocked_words_filter.lua` setup is detected, it is reused. Otherwise, the extension installs its own blocking filter.
- Demotion uses a separate filter and never suppresses the candidate.
- Original `*.schema.yaml` files are never modified.

The current Raycast package targets macOS and uses Squirrel for deploy and sync actions. The product name and schema management model remain frontend-neutral so support for another platform can be added later.

## User Data Discovery

The extension checks the following sources in order:

1. A directory selected in the extension preferences
2. The standard Squirrel directory at `~/Library/Rime`
3. Valid Rime directories found through a time-limited Spotlight query in the user's home directory

A directory is accepted only when it contains recognizable Rime state or schema files. The detected directory is shown in the main command and can always be overridden in preferences.

## Privacy

Candidate text and input codes in blocking and demotion rules are hidden by default. Revealing them invokes Apple's `LocalAuthentication` framework through the included native helper. Passwords and biometric data are handled only by macOS and are never received, logged, or stored by this extension.

After successful authentication, the helper writes a one-time permission marker with mode `600` and returns to the Raycast command through a deeplink. The marker contains no candidate text and expires after 60 seconds.

## Development

```bash
npm install
npm run dev
```

Available commands:

- Manage Rime
- Pin Candidates
- Block or Demote Candidates
- Set Per-App Input Mode
- Deploy Rime
- Sync Rime User Data

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Native Authentication Helper

The universal macOS helper is built from [`native/rime-manager-auth.swift`](native/rime-manager-auth.swift). Rebuild it reproducibly with:

```bash
./scripts/build-auth-helper.sh
```

The script compiles separate Apple Silicon and Intel executables, combines them with `lipo`, and prints the final SHA-256 checksum. The helper is used only for local device-owner authentication and returning to Raycast.

## Safety

- Original schema files are never modified.
- Configuration writes use a temporary file followed by an atomic rename.
- Existing files are backed up before replacement.
- Full backups exclude generated build data, Git data, local snapshots, and LevelDB user dictionaries.
- The extension does not pull or overwrite third-party configuration repositories.
- The extension does not collect analytics or send Rime configuration off the device.

## License

MIT

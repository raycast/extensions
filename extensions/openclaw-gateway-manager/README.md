# OpenClaw Gateway Manager

Manage a local OpenClaw Gateway from Raycast. OpenClaw and its CLI must already be installed on your Mac.

- **OpenClaw Status** shows gateway health, channel status, and session counts.
- **OpenClaw Sessions** lists sessions, models, and context usage, with an optional cleanup action.
- **OpenClaw Logs** searches recent local logs, filters by severity, and groups repeated entries.
- **Restart OpenClaw Gateway** restarts the local gateway service.

The extension runs the local OpenClaw CLI for status, sessions, restart, and cleanup. Restart and cleanup happen only when explicitly selected. Logs are read from local files; the extension does not manage remote gateways.

## Preferences

The CLI and logs are discovered automatically by default. Set a custom CLI path, state directory, configuration file, or log path in Extension Preferences if you use a nonstandard installation or a separate profile. The state and config paths apply to the extension's CLI subprocess and do not change your OpenClaw configuration. Additional preferences control command timeout, output limits, log reading, and filtering.

When a custom state directory, configuration path, or profile is used, automatic log discovery avoids default-instance logs. Set a log path or diagnostic log directory if the instance stores logs elsewhere.

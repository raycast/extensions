# Troubleshooting

## “Proton Pass CLI not found”

Check that the CLI works in a terminal, then restart the Raycast command. If Raycast does not share the same `PATH` as your terminal:

1. Open the extension preferences;
2. enter the absolute path to `pass-cli` or `pass-cli.exe`;
3. use **Check Again**.

From the error screen, **Copy Detection Diagnostics** copies the list of paths that were checked. This is useful for diagnosing a non-standard installation.

## “Proton Pass session is not authenticated”

Authenticate the Proton Pass CLI with your account, then retry the command. The extension cannot replace or repair the CLI session.

## Data appears out of date

The cache allows summaries to appear quickly while loading. Use **Refresh** to request a new list from the CLI. Details and sensitive fields are always read again when you explicitly request an action.

## A command fails or times out

Retry after a few seconds and check that the CLI responds correctly. Item listing has a longer timeout for large vaults; other commands use a shorter timeout to avoid blocking Raycast.

If the issue persists, record:

- operating system;
- Raycast version;
- Proton Pass CLI version;
- affected Raycast command;
- exact error message, without sharing any secrets.

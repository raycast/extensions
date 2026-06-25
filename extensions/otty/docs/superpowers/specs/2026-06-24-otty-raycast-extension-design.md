# Otty Raycast Extension Design

## Goal

Build a Raycast extension similar to Warp's Raycast entry points, but targeting the locally installed Otty terminal at `/Applications/Otty.app`.

The first version should expose direct Raycast commands, not a custom dashboard. Users should be able to search Raycast for Otty actions and trigger common terminal workflows quickly.

## Confirmed Local Context

- Otty is installed as `/Applications/Otty.app`.
- The shell command `otty` is not currently available on PATH.
- The Otty app bundle contains a control CLI at `/Applications/Otty.app/Contents/MacOS/otty-cli`.
- Otty registers support for `ssh://` URLs and an "Open in Otty" folder service.

## Scope

### Commands

The extension exposes these Raycast commands:

- `Open in Otty`: launch Otty with a new default window.
- `New Window`: open a new Otty window.
- `New Tab`: create a new tab in the running Otty app, falling back to a new window if tab IPC fails.
- `Open Directory`: open a selected directory in Otty.
- `Run Command`: run a user-provided shell command in Otty.
- `SSH`: open an SSH target in Otty from either `user@host` or `ssh://...` input.

### Preferences

The extension provides one preference:

- `Otty CLI Path`, defaulting to `/Applications/Otty.app/Contents/MacOS/otty-cli`.

This keeps the extension working with the current local install while allowing the user to point to a PATH-installed or future CLI location.

## Architecture

The extension is a standard Raycast TypeScript project.

Shared Otty integration lives in `src/lib/otty.ts`. Command files stay thin and only collect Raycast arguments, call the shared Otty helper, and display success or failure feedback.

The helper layer is responsible for:

- Resolving the configured CLI path.
- Checking that the CLI exists and is executable.
- Running `otty-cli` with argument arrays instead of shell-concatenated command strings where possible.
- Falling back from tab-specific actions to `open` when the app is not running or IPC fails.
- Producing user-facing Raycast toast errors with actionable messages.

## Command Behavior

### Open in Otty

Runs `otty-cli open`. This is the generic launcher command shown in Raycast search.

### New Window

Runs `otty-cli open`. It is kept separate from `Open in Otty` to match the Warp-style Raycast command list and support a distinct command title.

### New Tab

Attempts `otty-cli tab new`. If that fails, the command runs `otty-cli open` and reports that it opened a new window instead.

### Open Directory

Accepts a directory path argument from Raycast.

The first implementation runs Otty with a shell command that changes into the target directory and starts the user's shell:

```bash
otty-cli open -e /bin/zsh -lc 'cd "$TARGET_DIR" && exec "${SHELL:-/bin/zsh}"'
```

The Raycast implementation must pass the directory through environment variables or argument arrays so spaces and shell metacharacters in folder names do not become command injection risks.

### Run Command

Accepts a required text argument and runs it in a new Otty window using:

```bash
otty-cli open -e /bin/zsh -lc "$COMMAND"
```

This intentionally runs user-provided shell text because that is the feature's purpose. The command should display the submitted command in Raycast feedback so the user can see what was launched.

### SSH

Accepts a required text argument:

- If input starts with `ssh://`, open that URL with macOS `open`.
- Otherwise, run `ssh <target>` in Otty.

The first version does not maintain saved host profiles. That belongs in a later main-view command if needed.

## Error Handling

Errors are surfaced with Raycast toasts:

- Missing CLI path: tell the user to install Otty or update the `Otty CLI Path` preference.
- Non-executable CLI: tell the user which path failed.
- Command failure: show the command action that failed and include stderr when available.
- New tab fallback: show a success toast that a new window was opened because the tab action was unavailable.

## Testing

The implementation should include unit tests for the Otty helper where practical:

- CLI path preference fallback.
- Missing CLI path error shape.
- SSH target normalization.
- Directory command construction does not inline raw directory text into a single shell string.

Manual verification should run:

- TypeScript compile.
- Raycast lint if available.
- Unit tests.
- At least one direct Otty CLI smoke command against the installed app bundle, without relying on global PATH.

## Out of Scope

- A custom Raycast list/dashboard.
- Saved SSH profiles.
- Directory frecency or project indexing.
- Otty config/theme/keybinding management.
- Publishing to the Raycast store.

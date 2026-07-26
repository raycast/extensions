# QuitAll

QuitAll closes every running macOS application shown in the Dock with one Raycast command. It can also terminate explicitly configured applications and executable files that do not appear in the Dock.

## Commands

### QuitAll

Runs immediately without opening a Raycast view:

1. Sends a normal Quit request to matching applications and a `SIGTERM` signal to custom executable targets.
2. Waits for the configured timeout.
3. Automatically applies Force Quit to targets configured with that rule.
4. Offers one confirmation dialog for any other targets that are still running.
5. Shows a summary HUD.

Applications with unsaved work can display their standard save confirmation during a normal Quit. Force Quit can discard unsaved data.

### QuitAll "Kill" Rules

Provides three behaviors for installed applications:

- **Default** — request a normal Quit, then ask before Force Quit if the timeout expires.
- **Whitelist** — never quit the application.
- **Automatic Force Quit** — request a normal Quit, then force quit automatically if the timeout expires.

Raycast is always protected. Finder is added to the whitelist on first use, but its rule can be changed.

The command also lets you add a custom `.app` bundle or executable file:

- Press `⌘ N`, then choose an application or executable or enter an absolute custom path. Paths beginning with `~/` are supported.
- Select whether QuitAll should ask before Force Quit or apply it automatically on timeout.
- Use **Terminate Running Process…** or **Force Quit Running Process…** to act on that target immediately.

QuitAll targets every running process that matches the exact bundle or executable path and verifies both the PID and path again before sending a signal. For scripts launched through an interpreter, select the interpreter executable rather than the script file.

## Preferences

Set **Quit Timeout** in `Raycast Settings → Extensions → QuitAll`. Available values range from 2 to 10 seconds.

## Recommended Hotkey

1. Find **QuitAll** in Root Search.
2. Open the Action Panel (`⌘ K`).
3. Choose `Configure Command → Set Hotkey`.
4. Record a global shortcut, for example `⌃ ⌥ ⌘ Q`.

Raycast stores and handles the global hotkey.

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Publishing

```bash
npm run publish
```

The Raycast CLI authenticates with GitHub and creates a pull request in the public `raycast/extensions` repository.

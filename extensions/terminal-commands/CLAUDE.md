# Terminal Commands

Raycast extension (TypeScript + React) to be published on the Raycast Store. It lets the user save their own shell commands and run them in Terminal.

## Commands

- `npm run dev` — opens the extension in Raycast in development mode with hot reload
- `npm run build` — compiles and validates the extension
- `npm run lint` / `npm run fix-lint` — validates `package.json`, icons, ESLint and Prettier
- `npm run publish` — publishes to the Raycast Store (opens a PR on `raycast/extensions`)

Run `npm run build` and `npm run lint` before considering a change done.

## Structure

- `package.json` — extension manifest. Each command in `commands` needs a `src/<name>.tsx` file with a default export.
- `src/commands.tsx` — "My Commands": list of saved commands; runs, edits and deletes them, and creates quicklinks.
- `src/command-form.tsx` — form to create or edit a command (name + multiline command).
- `src/run-command.ts` — "Run Saved Command" (no-view): runs the saved command whose `id` comes in `launchContext`. It's the target of the quicklink deeplinks; launched directly it opens My Commands.
- `src/storage.ts` — `SavedCommand` type, defaults and `getSavedCommands()` (`LocalStorage`, key `commands`).
- `src/terminal.ts` — `runInTerminal()`: opens Terminal.app via AppleScript and runs the command (passed as an argument, not interpolated).
- `assets/extension-icon.png` — 512×512 icon with a transparent background.
- `CHANGELOG.md` — required by the Store; add an entry for every user-facing change.
- `raycast-env.d.ts` — auto-generated; don't edit or commit it.

## Conventions

- Language: everything in the repo is in English — code, identifiers, UI strings, file names, docs, commit messages and PR descriptions. Only the conversation with the user is in Spanish/Spanglish.
- Action titles must be Title Case (enforced by `@raycast/prefer-title-case`).
- Use `@raycast/api` components (`Detail`, `List`, `Form`, `ActionPanel`…) and `@raycast/utils` hooks instead of reimplementing them.
- `typescript` must stay below 6.1 (required by `@raycast/eslint-config`), and `@types/react`/`@types/node` must match `@raycast/api`'s peerDependencies.
- Quicklinks deeplink to the no-view `run-command` so they run without any UI. The user accepted that "Run Saved Command" shows up in root search; don't add other plumbing commands. Rejected alternatives: deeplinking to the `commands` view (flashes a loading screen) and opening `.command` scripts in Terminal (prints the script path and login noise).
- No hotkey features: the user doesn't want them.
- Before publishing, `author` in `package.json` must be the real raycast.com username.

## Git

- Never add a `Co-Authored-By: Claude ...` line or any other Claude attribution to commit messages or PR descriptions.

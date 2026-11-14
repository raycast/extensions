# Developing AI Limits

## Install locally

Prerequisites: macOS, Raycast, Node.js 22.22.2 (the version Raycast runs extensions on, pinned in `.nvmrc`), npm, and git.

```sh
git clone https://github.com/o101k/raycast-ai-limits.git
cd raycast-ai-limits
nvm use    # uses the Node version in .nvmrc; run `nvm install` first if you don't have it
npm install
npm run dev
```

`npm run dev` opens Raycast and loads the extension. The extension stays installed after you stop the dev server with Ctrl+C.

To update: `git pull && npm install && npm run dev`, or `npm run build` to build without starting the dev server.

## Layout

- `src/usage.tsx` is the only command. It fetches every provider in parallel and keeps the cached results.
- `src/lib/providers/` has one module per provider, and `index.ts` is the registry that sets the list order.
- `src/lib/usage-state.ts` holds the state transitions for the view (cached data, refresh, failures, sections). The hook in `usage.tsx` only stores their results.
- `src/lib/format.ts` holds the pure display helpers (percent, reset times, money, Markdown). It doesn't import Raycast.
- `src/lib/deps.ts` is the only place that touches files, `sqlite3`, the network and the clock. Providers receive it as an argument.
- `src/lib/github-auth.ts` holds the GitHub sign-in used by Copilot.
- `src/components/connect-forms.tsx` holds the forms that the Connect actions push: the API key form, which checks the key and reads the clipboard, and the cookie form.
- `src/lib/connect.ts` runs the Connect action for Claude Code, Codex, Gemini CLI and Cursor. It uses the helpers in `sign-in.ts` and `keychain.ts`, and it never imports Raycast.
- `src/lib/sign-in.ts` finds the CLIs, opens their sign-in in Terminal and checks whether each one is signed in. It also reads the PATH, `CLAUDE_CONFIG_DIR` and `CODEX_HOME` from the user's login shell, since Raycast's own environment has neither reliably. `src/lib/keychain.ts` reads Claude Code's Keychain item.
- `src/lib/connections.ts` is the pure part of what Connect saves. `src/lib/connections-store.ts` keeps it in Raycast's LocalStorage.
- `src/lib/openrouter-auth.ts` holds OpenRouter's OAuth steps. `src/lib/openrouter-signin.ts` runs them with Raycast's OAuth client, so it isn't tested.

## Checks

```sh
npm test           # tests (Vitest)
npm run typecheck  # builds first to generate the Preferences types, then TypeScript over src/ and test/
npm run lint       # ray lint: ESLint, Prettier, manifest checks (needs internet access)
npm run build      # production build
```

`npm run lint` checks the author against raycast.com, so run it on a machine with internet access.

GitHub Actions (`.github/workflows/ci.yml`) runs these on pushes to `master` and on every pull request, using the Node version in `.nvmrc`.

## Tests

The tests never touch real credentials or the network. `test/fake-deps.ts` stands in for everything a provider reaches outside its own code: files, `sqlite3`, `fetch` and the clock. Each test describes the Mac's files and the HTTP answers it wants, and then checks the requests the provider sent. No test reads `~/.claude`, `~/.codex`, `~/.gemini`, Cursor's database or the Keychain, and none calls a real API. So `npm test` is safe to run anywhere.

- `test/format.test.ts`, `test/settings.test.ts` and `test/usage-state.test.ts` test the pure helpers.
- `test/registry.test.ts` checks that every provider reports "not connected" with no request on a fresh install.
- `test/providers/` tests each provider's parsers and credential lookup against recorded-style JSON.

When you add a provider, add a test file for it that uses `fakeDeps` only.

## Adding a provider

1. Add `src/lib/providers/<id>.ts` that exports `fetch<Name>Usage(deps, settings)` and a pure parser.
2. Add a `ProviderId` to `src/lib/types.ts`, and register it in `src/lib/providers/index.ts` with its `connect` method (a `ConnectMethod` from `src/lib/connect.ts`) and the `forget` keys that Disconnect removes.
3. If it needs a credential, add a preference to `package.json` and a field to `Settings` in `src/lib/types.ts`, and map it in `src/lib/settings.ts`.
4. Write `test/providers/<id>.test.ts`.

## Publishing to the Raycast Store

1. `author` in `package.json` is the Raycast username (`o101k`) and the license is MIT, as the Store requires.
2. Add 3 to 6 screenshots to a `metadata/` folder, 2000x1250 PNG each, all on the same background. Use Raycast's Window Capture with "Save to Metadata" while the extension runs in development mode.
3. `npm run lint` and `npm run build` must pass, and the distribution build should be tested in Raycast.
4. Run `npm run publish`. It opens or updates the PR on raycast/extensions. Respond to review comments there.

Later releases use the same `npm run publish` command. If others contributed to the extension, run `npx @raycast/api@latest pull-contributions` first.

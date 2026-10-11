# Developing Lid Awake

## Install locally

Prerequisites: macOS, Raycast, Node.js 22.22.2 (the version Raycast runs extensions on, pinned in `.nvmrc`), npm, and git.

```sh
git clone https://github.com/o101k/raycast-lid-awake.git
cd raycast-lid-awake
nvm use    # uses the Node version in .nvmrc; run `nvm install` first if you don't have it
npm install
npm run dev
```

`npm run dev` opens Raycast and loads the extension. The extension stays installed after you stop the dev server with Ctrl+C. Then follow the Setup steps in [README.md](README.md).

To update: `git pull && npm install && npm run dev`, or `npm run build` to build without starting the dev server.

To uninstall: remove the sudoers rule (see README), then in Raycast right-click the extension and choose Uninstall.

## Checks

```sh
npm test           # unit tests (Vitest)
npm run typecheck  # builds first to generate the Preferences types, then TypeScript over src/ and test/
npm run lint       # ray lint: ESLint, Prettier, manifest checks (needs internet access)
npm run build      # production build
```

`npm run lint` checks the author against raycast.com, so run it on a machine with internet access.

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on pushes to `master` and on every pull request, using the Node version in `.nvmrc`. A second job runs the integration tests on `macos-latest`.

## Integration tests

`npm run test:integration` (`test/integration/`) runs the real `pmset`, `sudo`, `visudo`, `sysctl`, `dscl` and `mktemp` commands. It covers turning sleep on and off, the sudoers rule for a dedicated test user (install, concurrent and failed installs, removal), and the session rules: timers, restarts, overlapping Starts, a menu bar launch failure and the battery cutoff. Only the Raycast API is faked.

These tests change real sleep and sudoers settings, and they need passwordless sudo. They remove `/etc/sudoers.d/raycast-lid-awake` and turn sleep off when they finish, so on a Mac you use every day, the Lid Awake rule you set up stops working until you run Set up again. Run them only in CI on macOS, or locally on a throwaway Mac with:

```sh
LID_AWAKE_INTEGRATION=1 npm run test:integration
```

Without `LID_AWAKE_INTEGRATION=1`, or on any system other than macOS, the suites are skipped. `npm test` never runs them.

## Publishing to the Raycast Store

1. `author` in `package.json` is the Raycast username (`o101k`) and the license is MIT, as the Store requires.
2. Add 3 to 6 screenshots to a `metadata/` folder, 2000x1250 PNG each, all on the same background. Use Raycast's Window Capture with "Save to Metadata" while the extension runs in development mode.
3. `npm run lint` and `npm run build` must pass, and the distribution build should be tested in Raycast.
4. Run `npm run publish`. It opens or updates the PR on raycast/extensions. Respond to review comments there.

Later releases use the same `npm run publish` command. If others contributed to the extension, run `npx @raycast/api@latest pull-contributions` first.

# Lid Awake

A Raycast extension that keeps your Mac awake with the lid closed. It uses `pmset -a disablesleep`, so the Mac keeps running when the lid is shut, and it turns that off again automatically when you ask it to, when the timer ends, when the battery gets low, or after a restart.

## What it does

Commands:

- **Setup Lid Awake**: installs or removes the passwordless rule that lets Lid Awake toggle sleep.
- **Keep Awake with Lid Closed**: pick 30 minutes, 1 hour, 2 hours, 4 hours, or indefinitely.
- **Allow Sleep**: turns Lid Awake off so the Mac can sleep normally.
- **Toggle Lid Awake**: turns Lid Awake on for your default duration, or off if it is already on.
- **Lid Awake Menu Bar**: a menu bar item that shows the state and time left, and enforces the auto-off rules.

Auto-off rules:

- **Timer**: turns off when the chosen duration ends.
- **Low battery**: turns off when running on battery at or below the cutoff. Set it to Off to disable this.
- **Restart**: turns off after a reboot.

Preferences:

- **Low Battery Cutoff**: Off, 5% to 50% (default 20%).
- **Default Duration**: 30 minutes, 1 hour (default), 2 hours, 4 hours, or Indefinitely. Used by Toggle Lid Awake.

## Install locally

Prerequisites: macOS, Raycast, Node.js 22.22.2 (the version Raycast runs extensions on, pinned in `.nvmrc`), npm, and git.

```sh
git clone https://github.com/omarkar101/raycast-lid-awake.git
cd raycast-lid-awake
nvm use    # uses the Node version in .nvmrc; run `nvm install` first if you don't have it
npm install
npm run dev
```

`npm run lint` checks the author against raycast.com, so run it on a machine with internet access.

`npm run dev` opens Raycast and loads the extension. The extension stays installed after you stop the dev server with Ctrl+C.

Then:

1. Run **Setup Lid Awake** and choose **Install Passwordless Toggle**. Enter your Mac password once.
2. Open **Lid Awake Menu Bar** once. Raycast menu bar commands must be run once before they appear in the menu bar.

## Using it and verifying

Turn it on with any start command. To check the system state:

```sh
pmset -g | grep SleepDisabled
```

It prints `1` when Lid Awake is on and `0` when it is off.

Emergency off, if the extension is unavailable:

```sh
sudo pmset -a disablesleep 0
```

Notes:

- The one-minute check runs only while Raycast is running.
- `pmset disablesleep` survives a reboot. Lid Awake turns it off after a restart: the menu bar command runs at Raycast launch and every minute, and turns the setting off as soon as it sees the restart.

## Updating

```sh
git pull && npm install && npm run dev
```

Or `npm run build` to build without starting the dev server.

## Uninstall

1. Run **Setup Lid Awake** and choose **Remove Passwordless Toggle**. This also turns Lid Awake off if it is on. Or run `sudo rm /etc/sudoers.d/raycast-lid-awake` yourself.
2. In Raycast, right-click the extension and choose Uninstall, or remove it from Extensions settings.

## What the sudoers rule allows

The setup installs `/etc/sudoers.d/raycast-lid-awake` with exactly this content (for your username):

```
<user> ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1
```

It lets your user run only those two `pmset` commands as root without a password. It does not grant any other root access. The file is validated with `visudo` before it is installed.

## Development

```sh
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript, covers src/ and test/
npm run lint       # ray lint: ESLint, Prettier, manifest checks (needs internet access)
npm run build      # production build
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on pushes to `master` and on every pull request. CI uses the Node version in `.nvmrc` (22.22.2), so local runs match it.

## Deploy to the Raycast Store

1. `author` in `package.json` is set to your Raycast username (`o101k`).
2. The Store requires the MIT license. This repo is already MIT (`LICENSE` and `package.json`).
3. Add 3 screenshots to a `metadata/` folder, 2000x1250 PNG each. Use Raycast's Window Capture with "Save to Metadata".
4. `npm run lint` and `npm run build` must pass.
5. Run `npm run publish`. It authenticates with GitHub and opens a PR on raycast/extensions. Respond to review comments there. Once merged, the extension appears in the Store within minutes.

Caveat: Store reviewers may question an extension that installs a sudoers rule. Keep the explanation above accurate, and be ready to justify exactly what the rule allows.

Later releases use the same `npm run publish` command. If others contributed to the extension, run `npx @raycast/api@latest pull-contributions` first.

## License

MIT (see `LICENSE`).

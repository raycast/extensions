# Timers for Raycast

[Link to the original repo](https://github.com/ThatNerdSquared/timers-for-raycast)

This is a lightweight extension allowing you to start and stop countdown timers and stopwatches on macOS and Windows. It works directly in Raycast, with no separately installed timer app required.

On Windows, a bundled native worker keeps each countdown running after the Raycast command closes. Alerts support the bundled WAV sounds, per-alert volume from 0 to 1, speech, and continuous ringing until dismissed. Completion notifications use the installed Raycast application's Windows identity and respect Windows notification settings.

Alert playback does not add a session to Windows media controls. Players close when playback ends, a timer is paused or dismissed, or an error occurs. Notification failures remain visible in Manage Timers until dismissed.

Use **Edit Preset** to change a saved timer's name, duration, or sound while preserving its Quicklink. **Show Alert Error** opens a failure toast with a **Copy Error** action. Sound previews offer **Stop Sound**, stop the previous preview before playing another, and stop when leaving the command.

Menu bar commands are available on macOS only. Their preferences and the "Configure Presets in Menu Bar" command remain available with descriptions marking this limitation.

Windows timers use persisted deadlines: after sleep they complete when the computer resumes. Paused timers stay paused. If a worker exits unexpectedly or the computer restarts, opening Manage Timers recovers active timers; overdue timers then alert. No startup service is installed.

### Development on Windows

Install Node.js, Rust with the `x86_64-pc-windows-msvc` target, and the Visual Studio C++ build tools. Run `npm install`, then `npm run dev`. Raycast's `rust:` bridge compiles and bundles the native worker.

For verification, run `npm run build`, `npm run lint`, `cargo test --manifest-path rust/Cargo.toml`, and `cargo build --manifest-path rust/Cargo.toml` followed by `node --test tests/timer-backend.test.mjs tests/windows-worker.test.mjs`. Native lifecycle tests play muted audio and send no desktop notifications.

With Raycast running, `cargo test --manifest-path rust/Cargo.toml -- --ignored --test-threads=1` also verifies that alerts publish no Windows media sessions and that Windows records a real notification. Set `RAYCAST_TIMERS_TEST_NOTIFICATION=1` when running the Node worker tests to exercise notification delivery through a separate timer worker.

### Preparing a submission

Run `npm run build` and `npm run lint`, test the distribution build in Raycast, and commit the intended changes. `git status --short --branch` should show a named branch and no pending changes.

When ready to submit, `npm run publish` uses Raycast's CLI to sync a GitHub fork, check upstream contributions, copy the extension into a separate submission checkout, push the submission branch, and create or update a draft pull request. It is a submission command, not a validation-only command. If the CLI reports upstream contributions, use `npx @raycast/api@latest pull-contributions`, resolve any conflicts, and repeat the checks before submitting.

The CLI temporarily checks out an older local commit when comparing upstream contributions. Keep build output ignored across those checkouts with `/rust/target/` and `/dist/` entries in `.git/info/exclude`. If an interrupted run leaves a detached checkout or Git lock, verify that no Git process is running and preserve pending changes before restoring the development branch.

<a id="install-extension-button" title="Install Timers Raycast Extension" href="https://www.raycast.com/ThatNerd/timers#install">
        <img height="64" style="height: 64px" src="https://assets.raycast.com/ThatNerd/timers/install_button@2x.png">
</a>

If you enjoy using Timers for Raycast and/or want to support further development, feel free to donate below!

<a href="https://www.buymeacoffee.com/nathanyeung" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Commands

_On macOS, allow Script Editor notifications in Focus settings. On Windows, allow Raycast notifications in Windows settings._

- [x] Start Timer (2, 5, 10, 15, 25, 30, 45, 60, and 90 minute variations)
- [x] Start Custom Timer (allows you to set a custom countdown and optionally save it for future use)
- [x] Manage Timers (view/rename/start/stop running or preset countdown timers)
- [x] Start Stopwatch
- [x] Manage Stopwatches (view/start/stop running stopwatches)
- [x] Dismiss Ringing Timer (stop a ringing alert for a finished timer, if you've checked the Ring Continously setting)
- [x] Preview Alert Sounds (test out the bundled timer alert sounds before selecting one in settings)
- [x] Stop Running Timer (stop the running timer closest to completion)

### Not Yet Implemented

- [ ] Set Alarm
- [ ] Manage Alarms (view/start/stop running alarms)

## Contributing

If you'd like to file an issue, make a feature request, or improve the code in this extension, feel free to open an issue or PR! Here are a few pieces of advice:

- Please check my [personal repo for this extension](https://github.com/ThatNerdSquared/timers-for-raycast) first as I may already be working on a fix, or there may already be an issue/PR for your idea ;) I am also more reachable there for PRs/issues.
- If you decide to file an issue on the main `raycast/extensions` repo, please ping me (`@ThatNerdSquared`) so that I don't miss your request!
- Feel free to reach out to me on the Raycast Slack (`@ThatNerd(Squared)`) if I have not responded to you in a timely manner.
- `src/hooks/useTimers.ts` contains the custom React hook that I use for state management across various commands, and `timerUtils.ts` contains backend functions I use to create the actual timer files.
- Custom timer presets are stored in `customTimers.json`, keyed by UUID. Running `.timer` files store JSON records with name, pause state, selected sound, and execution metadata. New filenames include the start timestamp, duration, and a UUID to prevent simultaneous timers overwriting each other. Legacy timer filenames and text records can still be read.
- If you submit changes, please update these contributing guidelines as necessary to prevent confusion :)

## Acknowledgements

Sound effects procured royalty-free from [Mixkit](https://mixkit.co/free-sound-effects/alerts/).

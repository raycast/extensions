# AWS (Granted) — Raycast Extension

Quickly open the AWS Console or a terminal session for any AWS SSO profile managed by
[Granted](https://docs.commonfate.io/granted/introduction), plus commands to log in via AWS SSO
and (re)generate your `~/.aws/config` profiles — all without leaving Raycast.

## Commands

- **AWS Console** — pick a profile, opens it in your browser (`assumego -c`).
- **AWS CLI** — pick a profile, opens a Terminal/iTerm window with `assume <profile>` already
  typed, relying on your shell's `assume` alias.
- **AWS SSO Login** — logs in via the AWS SSO device-code flow, showing the code so you can
  confirm it matches your browser before approving. Remembers your last-used start URL/region.
- **AWS SSO Populate Profiles** — runs `granted sso populate` to (re)generate `~/.aws/config`.
  Lets you pick a profile-name template from presets (or write a custom one), optionally trim a
  prefix from account names, set a profile prefix, prune stale profiles, toggle the
  credential-process integration, force the device-code flow, and pick a browser profile.

Both profile-listing commands share account list ordering based on usage (frecency): profiles you
open most often/recently bubble to the top, and a profile whose role was removed from
`~/.aws/config` simply stops appearing — no manual cleanup needed.

## Requirements

- macOS (the CLI command uses AppleScript to open Terminal/iTerm)
- [Granted](https://docs.commonfate.io/granted/getting-started) installed:
  ```sh
  brew tap common-fate/granted
  brew install common-fate/granted/granted
  ```
  This provides the `granted`/`assumego` binaries and the `assume` shell alias. The extension
  checks for Granted on startup and shows this install guide if it's missing instead of failing
  with a cryptic error.
- An AWS SSO-based `~/.aws/config` — generate one with **AWS SSO Populate Profiles**, or run
  `granted sso populate` yourself.
- (Recommended, not required by this extension directly) the
  [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), per
  Granted's own recommendation.

## Preferences

- **Terminal Application** — `iTerm` (default) or `Terminal`, used by the AWS CLI command.

## Development

```sh
npm install
npx ray develop   # hot-reloads into Raycast for local testing
npx ray lint       # add --fix to auto-fix formatting
npx ray build
```

## Installation

Since the extension is not in the Raycast store yet, to start you need to run `npx ray build` once, and then `npx ray develop` (then stop the command via CTRL+C) so that it installs it from local.

The commands need to be run from the folder where raycast-aws exists

## Distribution

See [DISTRIBUTION.md](./DISTRIBUTION.md) for how to share this extension with others (personal
reuse, a private team store, or the public Raycast Store).

# Apple Passwords (APW)

Search and manage Apple Passwords from Raycast using the [APW](https://github.com/bendews/apw) CLI.

## Features

- Search Apple Passwords by URL or domain — auto-detects the active browser tab
- Copy passwords, usernames, and one-time codes to clipboard or paste at cursor
- Save new passwords with built-in password generation (random, alphanumeric, memorable passphrase, PIN)
- Authenticate the APW daemon inline when macOS requests a PIN

## Requirements

Install the `apw` CLI via Homebrew:

```sh
brew install bendews/tap/apw
```

Then start the daemon:

```sh
apw start
```

## Commands

| Command | Description |
|---------|-------------|
| **Apple Passwords** | Search passwords by URL, copy password / OTP / username |
| **Save Apple Password** | Save a new or updated password; generates passwords on demand |
| **Authenticate Apple Passwords** | Enter the macOS PIN to authenticate the APW daemon |

## Configuration

| Preference | Default | Description |
|-----------|---------|-------------|
| APW CLI path | `/opt/homebrew/bin/apw` | Path to the `apw` binary |
| Copy secrets | `true` | Copy to clipboard instead of pasting at cursor |
| Cache Timeout | `5` minutes | How long to cache password list before re-fetching (0 = no cache) |

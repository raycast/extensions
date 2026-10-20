# CLIProxyAPI

A small Raycast front end for [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI). It covers a subset of the official Management Center: auth files, quota and rate-limit resets.

## Setup

1. In your CLIProxyAPI config, set `remote-management.secret-key`. CLIProxyAPI hashes it on startup, so keep a copy of the plaintext.
2. Open the extension preferences and enter:
   - **Server URL**: defaults to `http://localhost:8317`
   - **Management Key**: the plaintext secret key

## Install

```sh
npm install
npm run install-raycast
```

This builds the production version straight into Raycast. It stays installed without the dev server running. Run `npm run install-raycast` again after changing the code. Use `npm run dev` only while developing.

## What it shows

Every auth file grouped by provider, with:

- status, cooldowns and request counts
- live quota windows and their reset times (Codex and Claude)
- available Codex reset credits and Claude reset grants

Switch views from the search bar dropdown, or cycle through them with ⌘D:

- **Details**: the account list with a detail pane showing quota bars and status.
- **Limits**: one line per account with every limit inline as a progress ring, so you can compare all accounts at once.
- **Overview**: one entry per provider. Each limit shows the summed quota left across accounts, with one bar segment per account.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Refresh Account | ↵ |
| Refresh All Accounts | ⌘R |
| Reload Quota | ⌘⇧R |
| Next View | ⌘D |
| Open Management Center | ⌘O |
| Use Rate-Limit Reset (asks first) | ⌘⇧U |
| Clear Cooldown (asks first) | ⌘⇧K |
| Enable/Disable Account | ⌘⇧E |

"Use Rate-Limit Reset" spends one of the account's upstream reset credits or grants, and you can't get it back. "Clear Cooldown" only clears CLIProxyAPI's local routing cooldown and leaves upstream limits alone.

## Screenshots

The Store screenshots in `metadata` show Details, Limits and Overview using sample accounts and quota values.

# Codex Account Switcher

Manage local Codex accounts without leaving Raycast. Add, remove, search, and switch accounts, then check the remaining 5-hour and weekly usage for each account.

This extension uses [`codex-auth`](https://github.com/loongphy/codex-auth) for account management. Authentication remains under the control of Codex and `codex-auth`; the extension does not read, display, or copy tokens from `~/.codex/auth.json`.

## Features

- Add a Codex account through the official login flow
- Search and switch between accounts saved by `codex-auth`
- Remove an account after a confirmation prompt
- View 5-hour and weekly usage, reset times, plan type, and update time
- Choose between current usage from OpenAI and local cached usage
- Optionally show the active account's remaining usage in the menu bar

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- [`@loongphy/codex-auth`](https://www.npmjs.com/package/@loongphy/codex-auth) 0.3.0 or newer

Install the stable version of `codex-auth` globally:

```bash
npm install --global @loongphy/codex-auth@0.3.0
```

If the extension cannot find the executable, open the extension settings and enter its absolute path. The usual path for Apple Silicon Homebrew installations is `/opt/homebrew/bin/codex-auth`.

## Usage

Open **Codex Account Switcher** in Raycast. The action panel lets you:

- switch to the selected account;
- add an account and complete the Codex login flow in your browser;
- refresh usage information;
- copy the account email; or
- remove the selected account.

Switching accounts updates `~/.codex/auth.json`. Restart a running Codex CLI or Codex app session if it does not pick up the new account automatically.

When the active account is removed, `codex-auth` selects another saved account. Removing the final account also removes the local Codex login.

## Usage Refresh Modes

**Current via OpenAI** asks `codex-auth` to retrieve current usage with the saved ChatGPT authentication. It provides fresher information but makes a network request when the extension refreshes.

**Local Cache Only** reads the local Codex and `codex-auth` cache without making a remote request. It is faster and is the default for the optional menu bar command, but the displayed usage may be several hours old.

Current usage relies on an internal ChatGPT endpoint used by `codex-auth`. It is not a documented public API and may change without notice. Local cached usage remains available when a current refresh cannot be completed.

## External Service

`codex-auth` is an independent, open-source MIT-licensed CLI and is not bundled with this extension. Users install it separately and authenticate through the Codex login flow. The extension does not ask users to paste API keys or account tokens.

The optional current-usage refresh asks `codex-auth` to access an internal ChatGPT usage endpoint with the user's existing local authentication. That endpoint is not a documented public API, may change or stop working, and remains subject to [OpenAI's Terms of Use](https://openai.com/policies/terms-of-use/). The extension does not bypass usage limits or provide access beyond the signed-in account.

## Privacy

The extension invokes the locally installed `codex-auth` executable and reads account metadata from `~/.codex/accounts/registry.json`. It does not read, display, or copy authentication tokens stored in `~/.codex/auth.json`. When the user selects current usage, `codex-auth` performs the network request with the user's existing local authentication.

## Development

Install the extension dependencies and start the Raycast development build:

```bash
npm install
npm run dev
```

Run the validation checks before submitting a change:

```bash
npm run lint
npm run build
```

## License

This project is licensed under the MIT License. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for `codex-auth` attribution.

# Store Review Notes

Codex Account Switcher is a local companion for the open-source [`codex-auth`](https://github.com/loongphy/codex-auth) CLI.

## Reviewer Setup

1. Install the stable CLI: `npm install --global @loongphy/codex-auth@0.3.0`
2. Run the **Codex Account Switcher** command.
3. Use **Add Account** to complete the Codex login flow in the browser, or use an account already saved by `codex-auth`.
4. Enable **Codex Usage in Menu Bar** if the optional menu bar command should be reviewed.

When `codex-auth` is missing, both commands show an installation action and a link to the upstream installation guide.

## Local Data and Authentication

- The extension invokes the locally installed `codex-auth` executable.
- Account metadata and cached usage come from `~/.codex/accounts/registry.json`.
- Account switching is performed by `codex-auth`, which updates the local Codex authentication state.
- The extension does not read, display, copy, or store tokens from `~/.codex/auth.json`.

## Network Behavior

- **Local Cache Only** performs no usage network request.
- **Current via OpenAI** asks `codex-auth` to retrieve usage with the user's existing local ChatGPT authentication.
- Current usage relies on an internal ChatGPT endpoint used by `codex-auth`. It is not a documented public API and may change without notice.
- The extension does not bypass usage limits or provide access beyond the signed-in account.

`codex-auth` is independently distributed under the MIT License. Its attribution is included in `THIRD_PARTY_NOTICES.md`.

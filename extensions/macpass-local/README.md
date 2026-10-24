# MacPass for Raycast

A Raycast extension for searching MacPass entries and copying or pasting their credentials through MacPassHTTP. Requires MacPass with the ARM64 HTTP plugin enabled (default port: 19455).

## Install MacPass and MacPassHTTP

- **MacPass:** Download from the [official GitHub releases](https://github.com/MacPass/MacPass/releases) and move `MacPass.app` to `/Applications`. This extension was set up with MacPass **0.8.2**.
- **MacPassHTTP for Apple Silicon (ARM64):** Download `MacPassHTTP-0.3.3.zip` from the [qingmo fork's 0.3.3 release](https://github.com/qingmo/MacPassHTTP/releases/tag/0.3.3). This is a third-party ARM64 build; the upstream 0.3.2 release is Intel-only.

Extract the plugin archive and copy `MacPassHTTP.mpplugin` into `~/Library/Application Support/MacPass/`. In MacPass's plugin preferences, enable **Load incompatible plugins**, then restart MacPass. Version 0.3.3 is missing from MacPass 0.8.2's compatibility list, so it needs this override.

If macOS blocks this ad-hoc-signed build, quit MacPass and, after deciding to trust the downloaded fork, remove quarantine from this plugin only:

```sh
xattr -dr com.apple.quarantine "$HOME/Library/Application Support/MacPass/MacPassHTTP.mpplugin"
```

Reopen MacPass. Keep remote connections disabled; the extension connects locally on port **19455** by default.

## Use

1. Open and unlock your database in MacPass.
2. In Raycast, run **Search Entries** under **MacPass**.
3. Choose **Connect Database**. Approve the request in MacPass and name the connection **Raycast**. Return to Raycast to search.
4. Search by title or username. Press Enter to copy the password, Command-Enter to paste it, Command-U to copy the username, or Command-Shift-U to paste the username.

Use Command-R to refresh after editing entries or changing databases. Each database is paired separately. **Reconnect Database** requests another approval if you revoke or lose the existing pairing. MacPass may choose the first unlocked database containing HTTP settings; lock other databases if the wrong one is selected.

Paste targets the application that was frontmost when you invoked Raycast. MacPass and Raycast may require their usual macOS permissions for paste actions.

## Data handling

- HTTP requests go only to `127.0.0.1` on the configured port. The extension uses MacPassHTTP's AES-256-CBC protocol and checks response verifiers and database identity.
- Pairing requires MacPass approval and adds a client key to its database settings. Raycast's encrypted LocalStorage holds the pairing key, indexed by port and database hash. No master password is requested or stored.
- Search results contain titles, usernames, and UUIDs. They are held in memory for the command session, with no disk cache. Locking MacPass does not automatically clear an already-visible list; credential actions recheck authorization. Refresh clears the list if the database is locked.
- Passwords are requested only for a credential action and are never displayed or logged. The legacy API searches by title; it can return multiple matching entries, so the extension selects the exact UUID before using the password.
- Copy actions mark the clipboard content confidential to exclude it from Raycast clipboard history. Pasting uses Raycast's standard Clipboard.paste API. Clipboard content is not automatically cleared.
- No telemetry, remote services, or vault writes beyond MacPass's pairing settings.

## MacPassHTTP limitations

The plugin's `get-all-logins` implementation skips entries stored directly in the database root. Put searchable entries inside a group. It also supplies no group paths or URLs in search results. Password lookup requires a nonempty title; Unicode and punctuation are supported. This extension inherits the plugin's handling of groups and entries, including any recycle-bin entries it returns.

## Development / reinstall

From this directory:

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

The development command installs the extension in Raycast. Once it is ready, stop it with Control-C; the commands remain installed. Re-run it to rebuild changes. `npm run build` checks the production build and writes a `dist` directory.

Test fixtures use simulated credentials only. Automated tests cover pairing, encryption/verifier handling, database switches, duplicate titles, Unicode lookup, locked databases, invalid responses, and timeouts. Approving your actual database pairing and checking copy/paste in your chosen target app are manual steps.

The icon comes from the locally installed MacPass application and remains subject to the upstream project's terms. The integration code is MIT licensed.

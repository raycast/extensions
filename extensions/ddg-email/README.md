# DuckDuckGo Email

Generate DuckDuckGo Email Protection private aliases from Raycast.

This is an unofficial community extension and is not affiliated with DuckDuckGo. It communicates directly with DuckDuckGo Email Protection at `https://quack.duckduckgo.com/api`; it does not use a proxy server, analytics, or cloud sync.

## Setup

You can authenticate in either of two ways:

- Add a DuckDuckGo Email Protection access token in Raycast extension preferences.
- Leave preferences empty, run `Generate Duck Address`, request a one-time passphrase, and sign in with your Duck address.

The command stores the resulting access token locally in Raycast so you do not need to sign in every time. Generated aliases are copied to the clipboard and recent aliases are kept locally for quick reuse.

Before publishing to the Raycast Store, confirm the final Raycast store handle. The current `author` value is the handle accepted by Raycast's local linting tools.

## Privacy

- Access tokens are stored locally in Raycast.
- Recent aliases are stored locally in Raycast.
- One-time passphrases are never stored.
- No data is sent anywhere except DuckDuckGo Email Protection.

## Commands

- `Generate Duck Address`: Generate a private `@duck.com` alias, copy it, and manage recent generated aliases.

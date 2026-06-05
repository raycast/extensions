# DuckDuckGo Email

Generate DuckDuckGo Email Protection private aliases from Raycast.

This is an unofficial community extension and is not affiliated with DuckDuckGo. It communicates directly with DuckDuckGo Email Protection at `https://quack.duckduckgo.com/api`; it does not use a proxy server, analytics, or cloud sync.

## Setup

You can authenticate in either of two ways:

- Add a DuckDuckGo Email Protection access token in Raycast extension preferences.
- Leave preferences empty, run `Generate Duck Address`, enter your Duck address without `@duck.com`, request a one-time passphrase, and sign in with the passphrase DuckDuckGo sends you.

The command stores the resulting access token locally in Raycast so you do not need to sign in every time. Generated aliases are copied to the clipboard and recent aliases are kept locally for quick reuse, copying, or pasting.

## Privacy

- Access tokens are stored locally in Raycast.
- Recent aliases are stored locally in Raycast.
- One-time passphrases are never stored.
- No data is sent anywhere except DuckDuckGo Email Protection.

## Commands

- `Generate Duck Address`: Generate a private `@duck.com` alias, copy it, and manage recent generated aliases.
- `Generate and Copy Duck Address`: Generate a private `@duck.com` alias and copy it without opening a view. If no access token is saved, it offers to open the setup command.

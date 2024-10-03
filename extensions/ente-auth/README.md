# A Raycast extension that uses your Ente Auth exports

To use this extension, please export TOTP codes from either the Ente Auth app or the [CLI](https://github.com/ente-io/ente/tree/main/cli).

> [!NOTE]
> In the future, macOS keychain support will be added.

## Setup

1. Open a terminal.
2. Get the source code.
3. Get inside the project.
4. Assuming node is installed, run `ts-node src/index.ts import secrets.txt`.
5. Database can be found at `~/.local/share/ente-totp/db.json`

## TODO:
- [ ] Make instructions easier
- [ ] Find a way to add custom icons

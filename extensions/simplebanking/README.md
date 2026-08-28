# simplebanking for Raycast

Balances, transactions and a monthly overview from
[simplebanking](https://www.simplebanking.de) — right inside Raycast.

simplebanking is a menu-bar banking app for macOS with access to German banks over PSD2.
This extension is a read-only front-end for the data the app has already fetched. The
extension's own interface is in German, matching the app and its audience.

## How it works

The extension runs the `sb` command-line tool that ships inside the app bundle and reads its
JSON output. It does **not** talk to a bank itself and it never sees a credential.

What you see is the local cache simplebanking wrote on its last refresh. That is why none of
the view commands costs an authentication step, and none opens a browser window.

The one exception is **Refresh Accounts** — it asks the app for a real fetch, which may
require approval in your banking app. It is deliberately a command of its own, so that it
never happens to someone who only wanted to glance at a balance.

## Security

- No network access. The extension has no HTTP client and no URLs; its only I/O is running
  the local binary and reading its output.
- No credentials and no preferences. There is nothing for the extension to store. Bank
  credentials stay in the app, encrypted under a master password this extension never asks
  for and could not use.
- No shell. Commands run through `execFile` with a fixed argument list.
- It cannot move money. Initiating a transfer is not exposed — payments stay in the app,
  behind the master password and the bank's strong customer authentication.

## Requirements

simplebanking has to be installed. The binary is looked up in this order:

1. `~/.local/bin/sb` — the symlink simplebanking offers to create
2. `/usr/local/bin/sb`
3. `/Applications/simplebanking.app/Contents/MacOS/simplebanking-cli`
4. the same below `~/Applications`

The last two are intentional: someone who never set up the command-line tool should still be
able to use the extension without doing anything first.

## Commands

| Command | What it shows | Contacts the bank |
|---|---|---|
| Balance | Balance of every account, plus a total | no |
| Transactions | Bookings of the last 30 days, searchable | no |
| Monthly Overview | Income, spending, net, categories | no |
| Refresh Accounts | — | **yes** |

## Development

```bash
cd raycast
npm install
npm run dev
```

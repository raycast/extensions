# Bookface for Raycast

Search Bookface and chat with the YC Agent within Raycast.

An unofficial Raycast extension for the YC CLI. This is not affiliated with or endorsed by Y Combinator.

You need a Bookface account to use the CLI and this extension.

## What can it do?

- **Ask YC Agent** — ask the YC agent questions about the network, investors, fundraising, and more. Each answer shows what the agent searched to ground its response.
- **Search YC** — search Bookface for people, YC and non-YC companies, posts, deals, schools, employers, Startup Library articles, and Knowledge Base entries. Filter by type, toggle a sidebar preview, or export a type's full result set as CSV.
- **YC Account** — show the currently logged-in Bookface user.
- **Log out of YC** — clear your stored YC CLI credentials (with a confirmation).

## Who can use it?

This extension is for **YC alumni and founders with active Bookface access**. It wraps the official [`yc` CLI](https://bookface.ycombinator.com/cli) and uses the credentials stored at `~/.yc/credentials.json` after you sign in. You will not be able to authenticate without an existing YC account.

## A note on data use

Please respect the [YC founder ethics policy](https://bookface.ycombinator.com). **Scraping the alumni database and spamming YC alums is a violation of the founder ethics policy and can get you removed from YC.** This extension is intended for the same use cases as Bookface itself — finding people and companies you have a legitimate reason to reach.

## Setup

### 1. Install the `yc` CLI

```bash
curl -fsSL https://bookface.ycombinator.com/cli/install.sh | bash
```

The installer symlinks `yc` into `~/.local/bin/yc`. If you already have a `yc` on your `PATH` it falls back to installing as `ycp`.

### 2. Log in once

```bash
yc login
```

This opens your browser for OAuth (with a `--device` flag for headless/remote shells). Tokens are stored at `~/.yc/credentials.json` and refreshed automatically — the extension never touches them directly. To sign out, run `yc logout`.

### 3. Open Raycast

Run **Search YC**, **Ask YC Agent**, or **YC Account**. If the extension can't find the binary or you're not logged in, every command surfaces a clear empty state with the right command to copy and paste.

## Preferences

| Preference          | Description                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **yc CLI Path**     | Optional absolute path to the `yc` binary. If empty, the extension searches `$PATH` for `yc` or `ycp`, then falls back to `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`. |
| **Verbose Logging** | Logs each `yc` invocation, output size, and parse results to the Raycast console for diagnostics. Sensitive values are redacted. Off by default.                                     |

Set it from Raycast → Extensions → Bookface if you've installed the binary somewhere unusual.

## Tips

- ⌘⇧⏎ toggles a Markdown sidebar with type-specific details for the selected result.
- ⌘D pushes a full-screen Markdown view of post bodies, company descriptions, and Startup Library articles.
- ⌘⇧. copies the Bookface URL; ⌘⇧M copies it as a Markdown link.
- With a type filter selected in Search, ⌘⇧E exports that type's full result set as CSV (⌘⇧C copies it) — useful for pulling every matching company, founder, or deal, not just the first page.
- The "Search YC" command remembers your recent searches; "Ask YC Agent" remembers your recent questions.

## Troubleshooting

- **"yc CLI Not Found"** — install the CLI (see above), or set the **yc CLI Path** preference if it lives in a non-standard location.
- **"Not Logged In"** — run `yc login` (or `yc login --device` on remote shells), then re-run the command.
- **Search errors** — every failure toast includes a "Copy Error" action; paste the message into a `yc` issue if it persists.

## Credits

Built around the [YC CLI](https://bookface.ycombinator.com/cli). Issues with data freshness or auth flows are best [reported upstream to YC](mailto:software@ycombinator.com); issues with the Raycast Extension belong here.

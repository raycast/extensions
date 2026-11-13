# Yerd for Raycast

Manage your [Yerd](https://yerd.app) local PHP development environment directly from Raycast.

## Commands

| Command                         | Description                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Search Sites**                | Search and manage all local Yerd sites — open in browser, toggle HTTPS, pin PHP version, manage domains, share via Cloudflare Tunnel |
| **Manage PHP & Tools**          | Install, update, and configure PHP versions and dev tools (Composer, Node, Bun, Laravel installer, WP-CLI)                           |
| **Manage Services & Databases** | Start, stop, and restart services (Redis, MySQL, MariaDB, PostgreSQL, Meilisearch); create, backup, and drop databases               |
| **View Captured Mail**          | Browse mail captured by Yerd's built-in SMTP sink; view message bodies                                                               |
| **Manage Proxies**              | Add, remove, and list whole-host proxies and path rules                                                                              |
| **Yerd Status & Doctor**        | Live daemon health dashboard with diagnostics and repair                                                                             |

## Requirements

- **macOS** — this extension is macOS-only
- **Yerd** installed and running — [yerd.app](https://yerd.app)
- **Yerd CLI** on PATH — in the Yerd app go to **Settings → Terminal CLI → Install**

## Binary Discovery

The extension finds the `yerd` binary in this order:

1. The **Yerd CLI Path** preference (if set)
2. `~/Library/Application Support/io.yerd.Yerd/bin/yerd` (default install location)
3. Your shell `PATH`
4. `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`

## Troubleshooting

**"Yerd daemon is not running"** (exit code 69)
→ Open the Yerd app. The daemon starts automatically when the app launches.

**"Yerd CLI not found"**
→ In the Yerd app, go to **Settings → Terminal CLI → Install**.
→ Or set the **Yerd CLI Path** preference to the absolute path of your `yerd` binary.

**Sites show localhost URLs instead of `.test` domains**
→ The DNS resolver is not installed. In the Yerd app, go to **Settings** and install the resolver, or run `yerd elevate` in your terminal.

## Privacy

Everything stays local. The extension only shells out to your own `yerd` binary — no data leaves your machine.

## Icon

The extension icon is derived from the [Yerd](https://github.com/forjedio/yerd) logo, used under the [MIT License](https://github.com/forjedio/yerd/blob/main/LICENSE.md).

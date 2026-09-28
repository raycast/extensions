<img src="assets/icon.png" width="72" height="72" alt="Session Limits icon" />

# Session Limits

A lightweight **Raycast extension for Codex and Claude Code usage limits**. See remaining session and weekly quotas, reset times, and fresh readings in a native dashboard or optional menu bar.

Provider-neutral adapters also support [custom quota snapshots](docs/providers.md) from other coding assistants.

[Changelog](CHANGELOG.md) · [Report a bug](https://github.com/vkalipat/raycast-session-limits/issues/new/choose)

![Session Limits quota gauge in Raycast](media/session-limits-detail.png)

_Preview uses sample quota values._

## Install

Requires **macOS and Raycast 2.5.3+**.

Open **Store** in Raycast, search for **Session Limits**, and install it. Then open **Show Session Limits**.

No terminal commands, npm, or API keys to configure. Raycast manages updates automatically.

For a GitHub installation, [download the prebuilt ZIP](https://github.com/vkalipat/raycast-session-limits/releases/latest/download/session-limits.zip), unzip it, and select the **Session Limits** folder with Raycast's **Import Extension** command. Import the latest ZIP again to update that installation.

## Connect

| Provider            | Setup                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| **Codex**           | Your existing Codex sign-in is detected automatically.                   |
| **Claude Code**     | Choose **Connect Claude Code**, then use Claude Code to populate limits. |
| **Other providers** | Select a [local quota snapshot](docs/providers.md) in preferences.       |

Sign in to the provider’s official app or CLI first. Claude Code requires version **2.1.251+** with Pro or Max. Connecting adds a local status-line integration that preserves your existing status line and saves quota readings while Claude Code is active. Use **Disconnect Claude Code** to remove it.

## Use

- **Enter** opens quota details, including exact reset times.
- **⌘R** refreshes your limits.
- **Session Limits Menu Bar** adds an optional menu-bar view with refresh about every five minutes.

The menu-bar percentage is the lowest remaining quota across current readings. Failed refreshes and stale data are labeled and excluded from that total. Disable providers you don't use in preferences.

## Privacy

No server, telemetry, or browser scraping. The extension never reads or stores provider credentials. Codex uses its official CLI; Claude Code supplies quota metadata through its documented status-line interface. Only quota snapshots go into the display cache. Connecting Claude updates its local status-line setting; disconnecting restores the prior setting when the integration is still installed.

These are subscription limits, not API billing or context-window usage. [Compatibility and credential details →](docs/providers.md#compatibility)

## Develop

Node.js 22.14+ is required for development only.

```sh
git clone https://github.com/vkalipat/raycast-session-limits.git
cd raycast-session-limits
npm ci
npm run dev
```

`npm run check` runs TypeScript, lint, formatting, and the production build. `npm run bundle` creates the installable ZIP in `release/`.

One runtime dependency: the Raycast API. Adapters return a shared [`ProviderSnapshot`](src/core/types.ts); register new adapters in [`src/core/load.ts`](src/core/load.ts). The UI remains provider-neutral.

See [Contributing](CONTRIBUTING.md) to propose an adapter or improve compatibility. Store validation is available through `npm run lint:store`.

## Credits

Compatibility research: [CodexBar](https://github.com/steipete/CodexBar), [claude-codex-usage](https://github.com/jun1485/claude-codex-usage), and [OpenAI Codex](https://github.com/openai/codex). Independently implemented; no upstream code bundled. Unaffiliated with the providers or Raycast.

If Session Limits is useful, [star the project](https://github.com/vkalipat/raycast-session-limits) to help others find it.

[MIT license](LICENSE)

# Glimmer

Stream apps from your paired PCs with [Glimmer](https://github.com/Se7enbrc/glimmer), a Mac-native Sunshine game-streaming client.

## Setup

1. Install [Glimmer](https://github.com/Se7enbrc/glimmer/releases/latest) in Applications. Glimmer requires macOS 15.7 or later and Apple Silicon.
2. For a disk image installation, open Glimmer and choose **Glimmer › Install Command Line Tool…**. macOS asks for an administrator password to create `/usr/local/bin/glimmer`. The Homebrew cask creates the command link itself.
3. Open Glimmer and pair the PC running Sunshine. Configure streaming and Wake on LAN in Glimmer.
4. Install this extension in Raycast. Run **Stream App** or **Wake PC**. Enable **Glimmer Status** in Raycast’s extension settings to use the menu bar command.

To install Glimmer with Homebrew:

```sh
brew tap se7enbrc/glimmer
brew trust --tap se7enbrc/glimmer
brew install --cask glimmer
```

The extension checks `/usr/local/bin/glimmer`, `/opt/homebrew/bin/glimmer`, then `/Applications/Glimmer.app/Contents/MacOS/Glimmer`. The bundled executable also works without the command link. No shell profile or PATH configuration is required. Use a Glimmer release that supports the version 1 JSON commands, including `stop --json`.

## Commands

| Command        | What it does                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stream App     | Lists apps in sections for paired PCs. Shows PC status and puts the running app first. Hidden apps stay hidden unless running; choose All apps to reveal them.                                          |
| Wake PC        | Runs `glimmer wake <pc> --wait`, shows progress, and reports whether the PC answered. Glimmer waits up to 90 seconds.                                                                                   |
| Stop Streaming | Confirms, then runs `glimmer stop --json`. Stops this Mac’s stream, following Glimmer’s disconnect setting. Reports stopped, nothing streaming, or an error.                                            |
| Glimmer Status | Shows the live PC and app, resolution, frame rate, HDR or SDR, codec, and bitrate when available. Refreshes on Raycast’s 30-second interval. Includes Stop streaming, Open Glimmer, and manual refresh. |

In **Stream App**, choose **Stream**, **Resume**, or **Wake and Stream** for a sleeping PC, **Wake PC**, **Quit app on PC**, **Copy link**, or **Create Quicklink** from the action panel. Stream and Resume call Glimmer’s CLI directly and dismiss Raycast once the request is accepted. There is no extra URL confirmation. An occupied session fails safely with an Open Glimmer action; the extension never forces a takeover. Quit and shareable Quicklinks still use `glimmer://` links with Glimmer’s confirmations.

**Stop Streaming** confirms before ending the stream. Glimmer follows **Leave games running when you disconnect** in its General settings. When that setting is off, stopping also quits the game, so save first. The success message confirms the stream stopped without claiming the game was quit. The menu bar uses the same flow.

**Wake and Stream** waits for the sleeping PC to answer, then requests the stream directly through the CLI. If no app list is available while the PC sleeps, the PC row launches the running app or Glimmer’s configured starting app after waking. A failed wake never launches a stream.

The CLI does not open Glimmer. Only when no CLI executable is installed does Stop Streaming open `glimmer://stop` after confirmation. The fallback toast says the CLI is missing and the URL result cannot be verified; it does not claim the stream stopped. An older CLI, timeout, permission failure, or invalid response reports an error without trying the URL. Opening the fallback URL may launch Glimmer.

Quicklinks identify the PC by its saved ID and the app by name. Renaming an app can require recreating its quicklink. Spaces use `%20` and literal plus signs use `%2B`, matching Glimmer’s URL rules.

PC and app lists use Raycast’s `useCachedPromise`. Once the PC list finishes, app lists load in parallel. Each PC’s failure stays in its own section, where Wake PC and refresh remain available. Cached lists appear while refreshing; choose **Refresh apps** after changing pairing or the app library. The running app stays visible even when marked hidden. A running app can also be active on another device; only **Glimmer Status** describes this Mac’s live stream.

## Troubleshooting

Allow Raycast local network access when macOS asks; its Glimmer commands need to reach your PCs. If access was initially denied, enable Raycast in System Settings › Privacy & Security › Local Network, then restart Raycast and refresh the app list.

If the command is missing, the list commands show a setup view with the download link and a copyable Homebrew command. **Stop Streaming** uses the URL fallback described above; the menu bar offers **Set up Glimmer…**.

| Exit code            | Meaning and next step                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| 0                    | The request succeeded.                                                                                |
| 1                    | Glimmer couldn’t complete the request (for stop: PC mismatch or timeout). Open Glimmer and try again. |
| 2                    | Glimmer couldn’t use the command. Update Glimmer and the extension.                                   |
| 3                    | The PC didn’t answer. Check its power and connection.                                                 |
| 4                    | The PC isn’t paired or couldn’t be found. Check its pairing in Glimmer.                               |
| 5                    | Stop found no active stream. Reports “Nothing is streaming.”                                          |
| Other or interrupted | Glimmer stopped before completing the request. Try again.                                             |

Malformed JSON or an unsupported JSON version produces an error instead of an empty app list or an idle status. Unknown fields are ignored; documented nullable details remain unknown. A status error is never shown as “Not streaming”. Stop requires exit 0 with `{"result":"stopped","stopped":true,"version":1}` or exit 5 with `{"result":"noActiveStream","stopped":false,"version":1}`. A mismatched exit code or JSON shape is an error. Stop exits 1 and 2 report errors on stderr without JSON; the extension shows safe error copy rather than raw stderr.

The extension calls only Glimmer’s local command and URL automation surfaces. It makes no network requests of its own and implements no streaming, discovery, pairing, or Wake on LAN protocol. CLI arguments are passed directly without a shell. Glimmer manages pairing credentials and stream settings. Raycast caches PC names and app lists locally.

## Development

Source, tests, and contribution instructions are maintained in
[Se7enbrc/raycast-glimmer](https://github.com/Se7enbrc/raycast-glimmer).

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build -- --environment dist --non-interactive --output dist
```

The tests use local fixtures and mocked Raycast/process boundaries. They do not
launch Glimmer, contact a PC, or change pairing data.

## License

[MIT](LICENSE), Copyright 2026 ugfugl.io. The extension icon is copied from the owner-provided Glimmer artwork. Glimmer and Steam names and marks belong to their respective owners.

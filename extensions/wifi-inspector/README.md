# Wi-Fi Inspector

Scan nearby Wi-Fi networks, inspect your connection, and automatically measure download, upload, and latency — directly from Raycast.

## Requirements

- **Apple Silicon Mac** (M1 or later). The underlying helper does not support Intel Macs.
- **macOS 13 (Ventura)** or later.
- **Location Services** approval for **WifiScanner** on first scan (needed for real BSSIDs).

## Development

```bash
npm install
npm run dev
```

Open Raycast and run **Scan Nearby Networks** or **Current Connection**.

### Store screenshots

Screenshots must be real Raycast Window Captures (not mocked PNGs):

1. Create/ensure a `metadata/` folder in this extension.
2. In Raycast Settings → Extensions (or Advanced), assign a hotkey to **Capture Window**.
3. Run `npm run dev`, open a command, enable **Use Demo Data (Screenshots)** (`⌘⇧D`).
4. Press the Capture Window hotkey → tick **Save to Metadata** → capture.
5. Repeat for both commands (connected network with speed results visible).
6. Action Panel → **Use Live CLI Data** when finished.

```bash
npm run lint
npm run build
npm run publish
```

## How it works

This extension is a Raycast UI for the open-source [macwifi-cli](https://github.com/jaisonerick/macwifi-cli) (MIT).

On first launch it:

1. Looks for an existing `macwifi-cli` binary (optional preference path, or Homebrew).
2. If none is found, downloads the notarized `darwin_arm64` tarball from [GitHub Releases](https://github.com/jaisonerick/macwifi-cli/releases).
3. Verifies the archive with the published SHA-256 digest, extracts it into the extension support folder, and runs `macwifi-cli scan --json` / `info --json`.

You do **not** need to install macwifi-cli separately. An optional preference lets you point at a custom CLI path if you already manage the binary yourself.

When you open details on your **connected** network (in either command), Wi-Fi Inspector automatically runs a Cloudflare-based speed test and shows download, upload, and latency in the detail pane. Use **Re-run Speed Test** (`⌘⇧S`) to measure again.

## Commands

- **Scan Nearby Networks** — list nearby SSIDs with signal, band, channel, and security; auto speed-test when viewing the connected network’s details.
- **Current Connection** — details for the network your Mac is on, with automatic download / upload / latency measurement.

On saved / connected networks, use **Copy Wi-Fi Password** to read the Keychain entry (macOS will prompt each time).

## Credits

Wi-Fi scanning is provided by [macwifi-cli](https://github.com/jaisonerick/macwifi-cli) / [macwifi](https://github.com/jaisonerick/macwifi) by Jaison Erick and contributors, licensed under MIT. Speed tests use [Cloudflare’s public Network Quality endpoints](https://speed.cloudflare.com/). This extension is an independent Raycast frontend and is not affiliated with those projects.

# Lossless Switcher

> Bit-perfect Apple Music on macOS — detects the live audio format and auto-switches your DAC sample rate.

## What it does

Apple Music on macOS does not automatically reconfigure your output device's sample rate to match the source material. Play a 96 kHz hi-res master through a DAC stuck at 44.1 kHz and macOS silently downsamples it. Lossless becomes lossy.

This Raycast extension fixes that. A small background daemon tails the system log for `MediaToolbox` format reports from Music.app, parses the live codec / sample rate / bit depth, and re-configures the active output device via CoreAudio HAL to match — bit-perfect playback, automatically.

## Commands

| Command | Description |
|---|---|
| Now Playing | Currently-playing track + live format + actions |
| Switch Audio Format | Manual sample-rate / bit-depth picker |
| Toggle Auto-Follow | Enable / disable auto-switching |
| Lossless Status | Live sample rate in the menu bar |
| Uninstall Daemon | Remove the background watcher (run before removing the extension) |

## Permissions

On first run, macOS will prompt for **Automation → Music**. Click Allow. No other permissions needed.

## Removing the extension

**Run the `Uninstall Daemon` command first**, then remove the extension from Raycast. This stops the LaunchAgent and clears cached data. If you skip this step, the daemon will keep running until macOS restarts; you can clean up manually:

```bash
launchctl bootout "gui/$(id -u)/com.ariestwn.lossless-switcher" 2>/dev/null
rm -f ~/Library/LaunchAgents/com.ariestwn.lossless-switcher.plist
rm -rf ~/Library/Application\ Support/com.ariestwn.lossless-switcher
rm -rf ~/Library/Caches/com.ariestwn.lossless-switcher
```

## Build from source

```bash
git clone <this-repo>
cd lossless-switcher
npm install
npm run build-binaries  # produces universal Swift binaries in assets/
npm run dev             # opens in Raycast
```

`npm run build-binaries` requires Xcode command-line tools (`xcode-select --install`).

## License

MIT

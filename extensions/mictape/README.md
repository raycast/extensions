# MicTape

Record your Mac's microphone to `.m4a` files from Raycast — into folders you choose, named the way you want, with a timer in the menu bar.

Built for long sessions such as lectures and meetings: audio is flushed to disk every second, so a crash or a dead battery never costs more than the last second.

## Requirements

This extension drives the [`mictape`](https://github.com/t4kamuna/mictape) command-line tool (v0.2.0 or later), which does the recording. Install it first with Homebrew:

```sh
brew install t4kamuna/tap/mictape
```

Or build it from source:

```sh
git clone https://github.com/t4kamuna/mictape.git
cd mictape
swift build -c release
mkdir -p ~/.local/bin
install -m 755 .build/release/mictape ~/.local/bin/mictape
```

The extension looks for `mictape` in `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`. If you installed it elsewhere, set **MicTape CLI Path** in the extension preferences.

The first recording started from Raycast asks for microphone access for Raycast.

## Commands

- **Start Recording** — pick a destination and start recording in the background. If your file name template uses `{label}`, you are asked for a label (the next number is suggested).
- **Stop Recording** — stop and save.
- **Recording Status** — shows the elapsed time in the menu bar while recording.
- **Test Microphone** — records five seconds and reports the input level.
- **Recording Settings** — add or remove destinations and edit the file name template, with a live example.

## Destinations and file names

Set them in **Recording Settings**: pick a folder, or enter a glob so that every matching folder becomes a destination. The file name template supports `{label}` and `{date:FORMAT}`.

Settings are stored in `~/.config/mictape/config.json` and shared with the `mictape` command line. See the [mictape README](https://github.com/t4kamuna/mictape/blob/main/README.en.md#configuration).

```json
{
  "destinations": [{ "path": "~/Documents/Classes/[0-9]*-?*", "subdirectory": "audio" }],
  "filename": "{label}-{date:yyyyMMdd}.m4a"
}
```

## Privacy

Neither the extension nor `mictape` makes any network connection. Recordings are written only to your destinations.

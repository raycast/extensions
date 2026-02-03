# YouTube to Spotify

> Download YouTube videos as metadata rich Spotify local files

## Installation

To use this extension, you must have `yt-dlp` and `ffmpeg` installed on your machine.

The easiest way to install this is using [Homebrew](https://brew.sh/). After you have Homebrew installed, run the following command in your terminal:

```bash
brew install yt-dlp ffmpeg
```

Depending on your MacOS version, the package might be located in a different path than the one set by the extension. To check where `ffmpeg` was installed, run:

```bash
which ffmpeg
```

Then, update the path in the extension preferences to match the output of the above command.

You'll also need `ffprobe`, which is usually installed with `ffmpeg`. Just run `which ffprobe` and update the path accordingly.

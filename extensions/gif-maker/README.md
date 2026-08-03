# GIF Maker

Convert videos to GIFs with control over size, frame rate, trimming, and compression.

**Create GIF** opens a form to pick a video and choose the output size, frame rate, and an optional trim. Size is set by the longest side, so a preset means the same thing whether the video is portrait or landscape, and each option shows the exact resolution it will produce.

**Quick GIF from Finder** converts the video selected in Finder straight away, using the defaults from the extension preferences.

## Requirements

[ffmpeg](https://ffmpeg.org) is required:

```sh
brew install ffmpeg
```

[gifsicle](https://www.lcdf.org/gifsicle/) is optional. It powers the Compression setting, which typically shrinks the result by a further 20–35%:

```sh
brew install gifsicle
```

Both are located automatically in the usual Homebrew and system locations. If ffmpeg lives somewhere else, set its path in the extension preferences.

## Keeping GIFs small

GIF has no interframe compression, so files get large quickly — a few seconds of video can run to tens of megabytes. Three settings matter, in order:

1. **Size** — the biggest lever, since halving it roughly quarters the file.
2. **Duration** — trim to the part you actually need.
3. **Frame rate** — 15 fps is usually indistinguishable from 30 and half the size. Screen recordings tolerate lower rates especially well.

**Reduce grain** helps on phone and camera footage, where sensor noise can triple the file size. Leave it off for screen recordings, where it only softens text.

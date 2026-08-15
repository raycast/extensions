# ▶ Now Playing

Show the current track and artist directly in the Raycast menu bar.

## Menu Bar Options

You can configure the menu bar item to show:

- Track + artist
- Track only
- Artist only
- Track + album
- Artwork only
- A custom template using `{track}`, `{artist}`, and `{album}`

`Track Only`, `Artist Only`, and `Track + Album` are text-only modes. `Artwork Only` hides text entirely. Album artwork can optionally appear alongside the title in `Track + Artist` and `Custom Template` modes.

## Install `media-control` (macOS)

Now Playing uses `media-control` to detect the currently playing track.

Recommended (Homebrew):

```bash
brew install media-control
```

Verify installation:

```bash
media-control get
```

Alternative (advanced): build from source at [ungive/media-control](https://github.com/ungive/media-control).

# Oneko for Raycast

Control [Oneko](https://github.com/oneko-swift/oneko-swift), the desktop cat
that chases your cursor, without leaving Raycast.

## Commands

- **Toggle Cat** — show or hide the cat, starting Oneko if needed
- **Change Skin** — pick from all 27 sprites, with previews
- **Set Speed** — slow, normal, or fast
- **Quit Oneko** — quit the app

The extension requires the Oneko app 1.2 or later (macOS 13+):

```sh
brew install --cask oneko-swift/tap/oneko
```

All commands talk to the app through its `oneko://` URL scheme, so the
extension needs no permissions of its own.

## Development

The extension lives in the
[oneko-swift repo](https://github.com/oneko-swift/oneko-swift/tree/main/raycast),
where the skin thumbnails in `assets/skins/` are generated from the sprite
sheets with `swift tools/makethumbs.swift Resources raycast/assets/skins`.

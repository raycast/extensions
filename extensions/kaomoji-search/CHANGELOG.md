# Kaomoji Search Changelog

## [Use native copy/paste actions] - 2026-05-10

- Replace manual `Clipboard.copy` / `Clipboard.paste` actions with `Action.CopyToClipboard` and `Action.Paste`
- Keep recent history behavior by adding kaomoji through `onCopy` / `onPaste` callbacks

## [Update] - 2025-10-14

- Added support for pinning kaomojis

## [Windows Support + Modernize] - 2025-10-06

- Add Windows Support
- Add `metadata` images
- Modernize: remove `Preferences` type + update deps
- `usePromise` to reduce complexity of useSearch hook

## [Grid layout] - 2023-02-07

- Add Grid layout support
- Upgrade `@raycast/api` and `asciilib`
- Add frequently used section

## [Misc] - 2022-02-11

- Misc: Unify naming of paste actions

## [Initial Version] - 2022-01-27

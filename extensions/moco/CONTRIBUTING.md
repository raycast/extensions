# Contributing to MOCO

This guide covers what this extension expects beyond the
[Raycast contribution guide](https://github.com/raycast/extensions/blob/main/CONTRIBUTING.md).

## Getting started

```bash
npm install
npm run dev          # builds, loads into Raycast and rebuilds on save
```

`npm run dev` does not pick up removed or renamed commands in `package.json`. Restart it after such a change.

## Before you open a PR

There are no automated tests. Run these checks and test your change in Raycast under `npm run dev`.

```bash
npx tsc --noEmit
npm run lint
```

Add an entry at the top of `CHANGELOG.md` in this format:

```markdown
## [<Title>] - {PR_MERGE_DATE}

- Added … by @<raycast-username>
```

Keep the `{PR_MERGE_DATE}` placeholder. It is replaced when the PR is merged.

## Screenshots

Store screenshots live in `metadata/` (`moco-1.png` to `moco-5.png`, PNG, 2000×1250). CI checks the size, the
padding around the window and that all images share the same background.

### Setup

1. In Raycast, open Settings → Advanced → Window Capture and record a hotkey, e.g. `⌘⇧⌥M`. When you capture, tick
   "Save to Metadata". It only shows while a window of this extension is open under `npm run dev`.
2. Set the Window Capture background to [Moonrise](https://misc-assets.raycast.com/wallpapers/moonrise.png) from
   [Raycast Wallpapers](https://www.raycast.com/wallpapers). All screenshots use it.
3. Use a Retina display. A non-Retina display captures at 1000×625, which fails the size check.
4. Use a MOCO account without real customer data.

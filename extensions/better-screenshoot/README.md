# Better Screenshoot

Trigger [Better Screenshoot](https://github.com/sriverogalan/better-screenshoot) captures from Raycast.

## Setup

1. Install **Better Screenshoot** from the [latest release](https://github.com/sriverogalan/better-screenshoot/releases/latest).
2. Open the app and grant **Screen Recording** (and **Accessibility** if prompted for global shortcuts).
3. In **Settings**, enable **Allow external control** (Raycast, CLI, URL scheme).

## Commands

| Command | Action |
| --- | --- |
| Capture Area | Select a region to capture |
| Capture Screen | Capture the full screen |
| Capture Window | Capture a specific window |
| Open History | Open capture history |

## Development

```bash
npm install
npm run dev
```

Requires Better Screenshoot installed with external control enabled.

## Publish to Raycast Store

1. Confirm your Raycast account username matches `author` in `package.json` (`sriverogalan`).
2. Build and test the distribution bundle:

```bash
npm run build
npm run lint
```

3. Open the extension in Raycast and verify each command works.
4. Add store screenshots to `metadata/` (Raycast → Advanced → Window Capture, 2000×1250 PNG). At least three are recommended.
5. Publish (opens a PR in [raycast/extensions](https://github.com/raycast/extensions)):

```bash
npm run publish
```

Use `npm` in this folder for publishing — Raycast CI expects `package-lock.json`.

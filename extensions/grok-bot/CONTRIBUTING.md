# Contributing

Connect the gateway with Tailscale Serve. The steps are in the [README](README.md). Do not document Funnel. Do not add Funnel tests.

Read [Legal](README.md#legal) before opening a Store PR. Do not claim affiliation with xAI. Do not commit xAI or Grok Bot branding assets.

## Run the checks

```bash
npm install
npm test
npm run lint
npx tsc --noEmit
npm run build
```

You need Node 22 or newer. Develop and run on macOS Raycast. This extension does not support Windows Raycast or Raycast for iOS. See [Platforms](README.md#platforms).

## Before you open a pull request

Do not commit tokens, `gateway.env`, or `.env` files. Do not paste a gateway token into an issue or a pull request.

Command titles follow Raycast store rules. Use Title Case, verb then noun: `List Bots`, `Ask Bot`.

## Store screenshots

`npm run publish` needs 3–6 PNGs at 2000×1250 in `metadata/`. Capture them with Raycast Window Capture in dev mode, same wallpaper. Do not invent shots. Do not show a token or Serve URL.

1. List Bots with a few teammates
2. Ask Bot form
3. Empty state **Can't reach your bots** or preferences

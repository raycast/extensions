# Internal maintainer notes

This repository is public solely to distribute the Raycast extension for the proprietary DevT Pro app for macOS and Windows. Do not add the app's source code, private paths, credentials, or other non-public product material to this repository or its public-facing documentation.

## Public-release boundary

- Keep the root `README.md` limited to installation, use, and end-user troubleshooting.
- Treat `src/shared/tools.json` as the published, checked-in tool index. Public builds must work without a local Flutter checkout.
- Keep source-sync instructions, deep-link verification, and Raycast Store submission notes in this file rather than in the root README.

## Commands

Requires Node.js 22.22.2 or later (required by `@raycast/api` 2.x). Use `npm` only; the Raycast Store CI builds with `npm` and needs `package-lock.json`.

For a public-release check:

```bash
npm install
npm run lint
npm run build
```

The following command requires authorized access to the private DevT Pro Flutter project:

```bash
# Refresh the checked-in tool index from the Flutter app.
npm run generate-tools

# Or provide the app location explicitly.
node scripts/generate-tools.mjs --flutter-app /path/to/developer-tools-pro
```

`generate-tools` formats `tools.json` with Prettier afterward so `npm run lint` stays clean.

After refreshing the index, inspect and commit the resulting `src/shared/tools.json` change, then run the public-release checks above.

## Tool-index source

`scripts/generate-tools.mjs` reads these private-app files:

- `lib/routing/app_routes.dart`
- `lib/features/shared/models/tool.dart`

It resolves the Flutter project path in this order: the `--flutter-app` option, `FLUTTER_APP_PATH`, then the legacy sibling path `../flutter_application_1`. The generated index contains only the metadata needed by the extension: tool names, categories, routes, deep links, descriptions, input support, icons, and keywords.

## Local install

```bash
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast (macOS or Windows) and rebuilds on change.

## Platform support

The manifest declares `"platforms": ["macOS", "Windows"]`. Keep the code cross-platform:

- Use `Keyboard.Shortcut.Common.*` or `{ macOS, Windows }` shortcut objects. Never use a bare `cmd` modifier.
- `openInApp` passes the `dev.aadhil.developer_tools_pro` bundle identifier to `open()` only on macOS. On Windows, the link goes to whichever app registered the `devtpro://` protocol.
- Keep Raycast v1 for macOS (1.104.x) working. It supplies its own `@raycast/api` at runtime, so building against API 2.x is fine as long as the code only uses APIs that 1.104 already has. v1 maps some `Keyboard.Shortcut.Common` entries differently (for example, Pin is ⌘⇧P there instead of ⌘.). Test in v1 before releasing when you adopt a newer API.
- Avoid macOS-only APIs (AppleScript, `showInFinder`, and so on) unless they're guarded by `process.platform`.

## Deep-link checks

With DevT Pro installed and launched at least once, verify representative links before releasing.

macOS:

```bash
open devtpro://formatters/json
open "devtpro://encoders_decoders/base64/encode?input=hello%20world"
```

Windows (PowerShell):

```powershell
Start-Process "devtpro://formatters/json"
Start-Process "devtpro://encoders_decoders/base64/encode?input=hello%20world"
```

The app must continue to handle those links through its deep-link router on both platforms.

## Raycast Store release

1. Confirm `npm run lint` and `npm run build` pass with the latest `@raycast/api` (`npm install @raycast/api@latest`). `ray lint` also checks the manifest against the Store, including the `author` handle.
2. Keep `author` set to the Raycast handle (`devtpro`). Only add `owner` if the extension moves to a Raycast organization, and use that organization's handle.
3. Add 3 to 6 screenshots to `metadata/` as 2000×1250 PNGs named `developer-tools-pro-1.png`, `developer-tools-pro-2.png`, and so on. Use Raycast's window capture during `npm run dev`, and use the same background and theme throughout.
4. Make sure the newest `CHANGELOG.md` entry uses the `## [Title] - {PR_MERGE_DATE}` heading.
5. Run `npm run publish`. This runs `ray publish`, which signs you in with Raycast and opens the pull request against `raycast/extensions`.
6. Address any review feedback in that pull request. Pull reviewer commits back with `npx ray pull-contributions` before you publish again.

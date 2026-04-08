# Relaunch App (Raycast Extension)

Kill and relaunch any running foreground macOS application from Raycast.

## Current Behavior

- Lists foreground GUI apps using `lsappinfo list`.
- Excludes system-critical UI processes:
  - `Dock`
  - `SystemUIServer`
  - `WindowServer`
  - `loginwindow`
- Lets you restart with confirmation or with `cmd+shift+r` (no confirmation).
- Restart flow:
  - `kill -9 <pid>`
  - wait `800ms`
  - relaunch with `open -b <bundleId>` or fallback `open -a <name>`

## Commands

- `bun run dev` starts Raycast dev mode.
- `bun run build` builds the extension.
- `bun run lint` runs Raycast lint checks.
- `bun run test` runs Bun unit tests.
- `bun run publish` submits the extension to Raycast Store using `bunx @raycast/api@latest publish`.

## Test Coverage

- `src/running-apps.test.ts` validates parser behavior for:
  - foreground filtering,
  - system app exclusion,
  - alphabetical sorting,
  - handling apps without bundle metadata.

## Raycast Store Publish Checklist

1. Ensure you are signed in to Raycast and your developer account is set up.
2. Run `bun install`.
3. Run `bun run lint`.
4. Run `bun run test`.
5. Run `bun run build`.
6. Run `bun run publish`.
7. In Raycast dashboard/review flow, verify metadata and submit for review.

## Notes

- The project uses `bun`/`bunx` for package management and scripts.
- Keep command metadata in `package.json` in sync with store-facing details.

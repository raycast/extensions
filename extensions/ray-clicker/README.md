# Ray Clicker

A simple idle clicker game for Raycast with upgrades, made as a learning exercise for Raycast extensions development.

## Features

- Active, Idle, and Efficiency upgrade trees, Raycast/productivity themed
- Buy max, cost reductions, milestones, and auto-clicker
- Prestige loop with permanent bonuses and UI estimate
- Golden Command random bonus with optional toast


## Requirements

- Current Raycast for macOS or Windows
- Node.js 22.22.2 or newer for development
- npm (with package-lock.json committed)

Use Command shortcuts on macOS and Control shortcuts on Windows. Progress is saved locally. When you reopen the game, you receive 50% of idle income earned while away.

## Development

- Install deps: `npm ci`
- Run in dev: `npm run dev`
- Lint & fix: `npm run fix-lint`

## Distribution Build (Store Readiness)

1. Type-check & bundle optimized build:
   ```bash
   npm run build
   ```
2. Lint checks:
   ```bash
   npm run lint
   ```
3. Open in Raycast to verify the built extension works as expected.

## Store Compliance Checklist

- Author uses Raycast username: `JonathanRReed`
- License: MIT
- API: build and lint use the version recorded in package-lock.json
- Categories: `Fun`
- Icon: `assets/icon.png` (512x512 PNG). Ensure high contrast in light/dark.
- No external analytics, no keychain usage
- No opaque binaries; no background downloads
- Naming follows Apple Style Guide; Title Case actions
- Navigation uses Raycast Navigation API
- Empty states handled; no flicker
- No localization beyond US English

## Screenshots

Use Raycast Window Capture (Preferences → Advanced):
![Ray Clicker screenshot](./metadata/ray-clicker.png)
- Size: 2000×1250 (16:10), PNG
- Use a single, high-contrast background
- Showcase informative views (Upgrades, Stats, Prestige)

## Notes

- CHANGELOG in root tracks version history

## License

MIT

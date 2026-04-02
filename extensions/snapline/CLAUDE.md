# Snapline

Raycast extension for screen measurement. macOS only.

## Structure

- `src/measure.ts` — Raycast command (no-view mode), calls Swift via `swift:` import
- `swift/Snapline/Sources/Snapline.swift` — native overlay with pixel sampling, edge detection, and measurement rendering
- `swift/Snapline/Package.swift` — Swift package (macOS 12+, uses Raycast Swift tools)

## Commands

```bash
npm run build      # ray build
npm run dev        # ray develop
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
```

## Tech Stack

- TypeScript, Raycast API (`@raycast/api`, `@raycast/utils`)
- Swift (Cocoa, CGImage pixel analysis, NSWindow overlay)
- ESLint with `@raycast/eslint-config`
- Prettier (printWidth: 120, double quotes)

## Conventions

- Commands use `no-view` mode
- Swift code is called from TypeScript via Raycast's `swift:` import scheme
- Use conventional commits (e.g. `feat:`, `fix:`, `style:`), max 60 chars, no description body

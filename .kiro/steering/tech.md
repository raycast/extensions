# Tech Stack

## Platform

- **Raycast Extension** — [`@raycast/api ^1.72.0`](https://developers.raycast.com/), `@raycast/utils ^1.16.0`
- **React** — UI components with JSX (`react-jsx`)
- **TypeScript** — Strict mode, target ES2020, CommonJS modules

## External Dependency

- **croc** — The extension wraps the `croc` CLI binary (not bundled). Must be installed separately via Homebrew (`brew install croc`) or Go.

## Process Management

- croc writes all output to `/dev/tty`, not stdout. A Python PTY wrapper (`/usr/bin/python3`) allocates a pseudo-terminal so croc output can be captured.
- Uses Node.js `child_process.spawn` (long-running) and `execFileSync` (one-shot) for process control.
- Code phrase is passed to croc receive via the `CROC_SECRET` environment variable (croc v10+).

## Dev Dependencies

- TypeScript `^5.2.2`
- ESLint via `@raycast/eslint-config ^1.0.8`
- Prettier `^3.0.3`

## Common Commands

All commands run from `croc-transfer/`:

```bash
npm run build      # Build for distribution (run after every code change)
npm run dev        # Launch Raycast dev mode with hot reload
npm run lint       # Lint
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

## Development Workflow (MANDATORY)

After every code modification:

1. Run `npm run build` from `croc-transfer/` and confirm it succeeds.
2. If the extension is not yet running in Raycast dev mode, also run `npm run dev`.
3. Never consider a coding task complete without a successful build.

## Extension Paths

- Extension root: `croc-transfer/`
- Source: `croc-transfer/src/`
- Build output: `croc-transfer/dist/`

## TypeScript Config

- `strict: true` — keep types explicit, avoid `any`
- Path alias: `@/*` → `src/*`
- Target/lib: ES2020
- Module: CommonJS
- JSX: react-jsx

## Coding Standards

- Prefer TypeScript; keep types clear and avoid unnecessary `any`
- Separate UI logic (components/hooks) from data logic (utils)
- Avoid unnecessary dependencies
- Avoid overengineering simple features
- Provide complete, production-quality code
- For external APIs, always handle setup, configuration, and error states

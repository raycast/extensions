# Contributing

Thanks for your interest in improving Folder Scope!

## Development setup

Requirements: macOS with Raycast installed, Node.js ≥ 22.14.

```bash
npm install
npm run dev     # loads the extension into Raycast in development mode
```

## Before opening a pull request

```bash
npm test        # unit tests (node --test, no extra frameworks)
npm run lint    # ray lint (ESLint + Prettier)
npm run build   # production build
```

All three must pass. Add or update unit tests for any non-trivial logic you change — pure logic lives in `src/utils/` and is tested with plain `node --test`, no additional test dependencies.

## Guidelines

- Keep changes small and focused; avoid unrelated refactors.
- Never spawn processes through a shell — executables are always invoked with argument arrays.
- No new runtime dependencies without a strong reason.
- User-facing behavior changes should be reflected in `README.md`.

## Releases

The extension is published to the Raycast Store via a pull request to [raycast/extensions](https://github.com/raycast/extensions); this repository is the development home.

# Technical Documentation

## Overview

This project is a TypeScript Raycast extension. UI components live at the root of `src/`, while domain modules are grouped by capability:

```text
src/
├── activity/       pins and last-use timestamps
├── authenticator/  TOTP item selection
├── items/          summaries, details, cache, and ranking
├── pass/           Proton Pass CLI detection and execution
├── passwords/      password generation
├── session/        CLI session status
├── vaults/         vault operations
└── raycast/        module composition and shortcuts
```

Raycast commands (`src/*.tsx`) coordinate the UI and delegate operations to the modules. `src/raycast/create-modules.ts` assembles the real dependencies: the Proton Pass CLI and Raycast `LocalStorage`.

## Data flow

1. The extension detects `pass-cli` and checks the session.
2. The CLI provides the vault list and item summaries.
3. Summaries and non-secret metadata are stored in the Raycast cache.
4. Details are loaded only when a user views an item or copies a field.
5. Local actions (pins and last-use timestamps) are stored separately and applied to the ranking.

Secrets are not part of `items.cache`. Copy actions use the CLI to read the requested field.

## CLI integration

`src/pass/pass-cli.ts` centralizes `execFile` calls and converts the CLI’s JSON responses into types used by the extension. Detection tries the configured path first, then `PATH` and standard macOS/Windows locations.

Errors are converted into UI-friendly states: CLI missing, session unauthenticated, or execution error.

## Tests

Tests use Node’s built-in test runner with `tsx`:

```bash
npm test
npm run test:coverage
```

They cover CLI detection, process timeouts and errors, item ranking, caching, vault operations, and TOTP item selection.

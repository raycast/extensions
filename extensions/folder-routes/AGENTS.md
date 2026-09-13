# Repository Guide

## Structure

- `src/*.tsx`: Thin Raycast command entry points.
- `src/components/`: Reusable Raycast views and forms.
- `src/domain/`: Destination types, normalization, validation, and other pure business logic.
- `src/services/`: LocalStorage, import/export, Finder selection, and filesystem operations.
- `tests/`: Focused tests for pure parsing and validation behavior.
- `assets/`: Extension and Store-facing image assets.

## Commands

- Install dependencies: `npm install`
- Develop in Raycast: `npm run dev`
- Format: `npm run format`
- Check formatting and lint: `npm run lint`
- Run tests: `npm test`
- Build the production extension: `npm run build`

## TypeScript and Architecture

- Keep TypeScript strict and use explicit domain types at module boundaries.
- Keep command entry points thin; React components must not contain storage, import parsing, or filesystem algorithms.
- Prefer small pure functions for parsing, normalization, validation, duplicate detection, sorting, and conflict naming.
- Access Raycast LocalStorage only through the destination repository service.
- Keep filesystem copy/move behavior behind a service and never silently overwrite or discard user data.
- Avoid new runtime dependencies unless the platform or Raycast APIs cannot reasonably provide the behavior.

## Verification

Before considering a change complete:

1. Run `npm run format`.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Inspect `git diff` and `git status`.
6. Record any Raycast/Finder UI scenarios that still require manual testing.

Publishing, pushing, opening pull requests, creating public repositories, and any other external changes require the user's explicit approval.

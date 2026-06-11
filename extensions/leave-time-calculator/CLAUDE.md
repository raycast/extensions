# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension for calculating leave time based on arrival time. Supports night shift (cross-midnight) calculations.

## Commands

```bash
npm run dev        # Development mode (Raycast extension)
npm run build      # Build for production
npm run test       # Run tests with vitest
npm run test -- tests/time-utils.test.ts  # Run specific test file
npm run test -- -t "calculateLeaveTime"   # Run tests matching pattern
npm run lint       # Lint (ray lint / ESLint + Prettier)
npm run fix-lint   # Lint auto-fix (ray lint --fix)
```

## Architecture

- `src/calculate-leave-time.tsx` - `no-view` command: subtitle update + launches view
- `src/calculate-leave-time-view.tsx` - `view` command: detailed List UI
- `src/lib/time-utils.ts` - Time calculation logic (leave time, remaining time, night shift handling)
- `src/lib/leave-status.ts` - Leave calculation + format facade
- `src/lib/preferences.ts` - Preferences helper
- `src/lib/subtitle.ts` - Subtitle update logic
- `src/lib/storage.ts` - Raycast LocalStorage wrapper for persisting today's start time
- `src/lib/types.ts` - TypeScript type definitions
- `tests/` - vitest tests

## Key Dependencies

- `@raycast/api` - Raycast extension framework
- `vitest` - Test runner (not bun test)
- `@raycast/eslint-config` - Linting and formatting (ESLint + Prettier)

## Development Guidelines

- Use `npm install` for dependency installation
- Use `npm run <script>` for running scripts
- Use `npx <package>` for one-off package execution

## Notes

- Preferences are defined in package.json under `commands[].preferences`
- Both commands (`calculate-leave-time` and `calculate-leave-time-view`) share identical preference definitions in package.json — keep them in sync when editing
- Time calculations handle cross-midnight shifts (e.g., 22:00 start -> 07:00 leave next day)
- Tests use `vi.useFakeTimers()` for time-dependent logic

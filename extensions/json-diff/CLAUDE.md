# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Raycast extension** called "JSON Diff" that compares two JSON objects locally with color-coded diff visualization. Built with TypeScript, React (JSX), and the Raycast API.

## Commands

- `npm run build` — Build the extension (`ray build`)
- `npm run dev` — Run in development mode (`ray develop`)
- `npm run lint` — Lint the code (`ray lint`)
- `npm run fix-lint` — Auto-fix lint issues (`ray lint --fix`)
- `npm run publish` — Publish to Raycast Store

## Architecture

```
src/
├── compare-json.tsx          ← Entry point: thin Command component
├── components/
│   └── DiffDetail.tsx        ← Diff result view with metadata and copy actions
├── hooks/
│   └── useJSONForm.ts        ← Form state, validation, format/swap/paste logic
├── lib/
│   ├── diff.ts               ← Myers diff algorithm (backtrack, myersDiff, computeDiff)
│   └── validate.ts           ← JSON validation helper
└── types.ts                  ← FormValues, DiffResult interfaces
```

Single-command extension registered as `compare-json` in package.json. Uses `@raycast/api` for UI components (Form, ActionPanel, Action, Detail) and `@raycast/utils` for the `useForm` hook.

ESLint uses `@raycast/eslint-config`. TypeScript targets ES2023 with CommonJS modules and React JSX transform.

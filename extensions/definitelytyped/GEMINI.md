# Project Context: DefinitelyTyped Raycast Extension

This project is a Raycast extension that allows users to search for `@types` packages from the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) repository directly from their terminal-like Raycast interface.

## Project Overview

- **Purpose:** Provide a fast, searchable interface for finding and installing TypeScript type definitions.
- **Core Technologies:**
  - **Framework:** React with TypeScript.
  - **API:** [@raycast/api](https://developers.raycast.com/) for building the extension UI and interacting with macOS.
  - **Utilities:** [@raycast/utils](https://github.com/raycast/utils) for data fetching (`useFetch`) and persistence (`useLocalStorage`).
- **Architecture:**
  - The extension performs live searches against the npm registry search API (`https://registry.npmjs.org/-/v1/search`).
  - Favorites are persisted locally using Raycast's `LocalStorage` API via the `useLocalStorage` hook.
  - It handles scoped packages (e.g., `@types/node__pkg` -> `@node/pkg`) by resolving package names.

## Building and Running

The project uses the `ray` CLI (via `npm` scripts) for development and builds.

- **Install Dependencies:**
  ```bash
  npm install
  ```
- **Development Mode:**
  Starts the extension with hot-reloading in Raycast.
  ```bash
  npm run dev
  ```
- **Build:**
  Prepares the extension for production.
  ```bash
  npm run build
  ```
- **Linting:**
  Uses `@raycast/eslint-config` for code quality.
  ```bash
  npm run lint       # Check for issues
  npm run fix-lint   # Automatically fix issues
  ```
- **Publishing:**
  Publishes the extension to the Raycast Store.
  ```bash
  npm run publish
  ```

## Development Conventions

- **React:** Functional components and hooks are standard.
- **TypeScript:** Strict mode is enabled (`strict: true` in `tsconfig.json`).
- **Styling:** Uses Raycast's built-in components (`List`, `ActionPanel`, `Action`, `Icon`) for a native macOS feel.
- **File Structure:**
  - `src/`: Contains the source code.
  - `src/types.tsx`: The main command implementation for searching packages.
  - `assets/`: Icons and static assets for the extension.
- **Code Style:**
  - Follows Raycast's ESLint and Prettier configurations.
  - Prefers standard Raycast UI patterns for actions (e.g., `⌘↵` to copy, `⌘⇧F` for favorites).

## Key Files

- `package.json`: Contains extension metadata (commands, icons, author) and dependency definitions.
- `src/types.tsx`: Implements the `Search @Types Packages` command, including search logic and favorite management.
- `tsconfig.json`: Configured for ES2023 and React JSX.
- `eslint.config.js`: Integrates Raycast's ESLint rules.

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This repository contains the **OpenHue** Raycast extension, which lets you control your Philips Hue lighting system from Raycast.

The project is a minimal Raycast extension written in TypeScript, driven by the Raycast extension manifest embedded in `package.json`. The main user-facing behavior is implemented as Raycast commands backed by source files in `src/`.

## Key Files and Directories

- `package.json`
  - Serves as the Raycast extension manifest (via the Raycast extension JSON schema).
  - Declares the extension metadata (name, description, icon, platforms, categories, license).
  - Defines the list of Raycast commands and their modes.
  - Configures dependencies (`@raycast/api`, `@raycast/utils`) and dev tooling (TypeScript, ESLint, Prettier, Raycast ESLint config).
  - Provides npm scripts that proxy to the Raycast CLI (`ray`).
- `src/`
  - Contains TypeScript source for Raycast commands.
  - Each command in `package.json` is expected to have a corresponding source file named after the command (e.g., the `lights` command is implemented in `src/lights.ts`).
- `assets/`
  - Contains static assets used by the extension, such as `extension-icon.png`, which is referenced from `package.json` as the extension icon.
- `README.md`
  - High-level description: "Control your Philips Hue lightning system from Raycast".

## Raycast Command Architecture

- Commands are declared in `package.json` under the `commands` array. Currently:
  - `lights` (`mode: "no-view"`) — a command intended to control lights without opening a dedicated Raycast view.
- The Raycast CLI and runtime will look for a matching command implementation in `src/` (e.g., `src/lights.ts`). That file should export the command logic using the `@raycast/api` primitives.
- The extension targets both `macOS` and `Windows` (see `platforms` field in `package.json`).

## Tooling and Linting

- **TypeScript**
  - Enabled via the `typescript` dev dependency. The Raycast CLI will compile TypeScript when building the extension.
- **ESLint**
  - Configured via `@raycast/eslint-config` and the `eslint` dev dependency.
  - Linting is orchestrated through the Raycast CLI (see `ray lint` in the npm scripts).
- **Prettier**
  - Available as a dev dependency for formatting. There is no repository-specific configuration file checked in yet; use your standard Prettier settings or Raycast defaults.

## Development Commands

All commands below assume you are running them from the repository root and have Node.js installed.

- **Install dependencies**
  - `npm install`
- **Start Raycast development mode** (live-reload extension while editing)
  - `npm run dev`
  - Internally runs `ray develop` via the Raycast CLI.
- **Build the extension**
  - `npm run build`
  - Uses `ray build` to compile the TypeScript sources and package the extension.
- **Run linting**
  - Lint all files: `npm run lint`
  - Auto-fix lint issues where possible: `npm run fix-lint`
- **Publish to the Raycast Store**
  - `npm run publish`
  - This calls `npx @raycast/api@latest publish`. Use this to publish the extension to the Raycast Store (not npm).

The npm scripts rely on the Raycast CLI (`ray`) being installed and available in your environment.

## Testing

- There is currently **no test script** defined in `package.json`, and no test framework is configured in this repository.
- If you add tests in the future (e.g., using Jest or another framework), also add a corresponding `test` script to `package.json` so future agents know how to run the full test suite and individual tests.
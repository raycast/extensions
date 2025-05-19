# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension package that's part of the homebase-monorepo. It appears to be a template or initial setup for a Raycast extension with the name "hello-world" (to be renamed).

## Common Commands

```bash
# Navigate to this package
cd packages/op-secrets

# Development (runs Raycast in development mode)
pnpm dev

# Build the extension
pnpm build

# Run from the monorepo root (alternative method)
pnpm --filter hello-world dev
```

## Architecture

This is a Raycast extension with a minimal structure:

- `src/index.tsx`: Main entry point containing the default command component
- `package.json`: Extension manifest defining the command metadata
- `raycast-env.d.ts`: Auto-generated TypeScript declarations for Raycast APIs and preferences

## Development Notes

- This is a Raycast extension and requires the Raycast app to be installed
- The extension currently displays a simple "Hello World!" message using Raycast's `Detail` component
- The `raycast-env.d.ts` file is auto-generated and shouldn't be modified manually
- Extension configuration is managed through `package.json`
- The actual name "op-secrets" in the directory doesn't match the package name "hello-world" - this may need alignment

## Extension Configuration

The extension is configured in `package.json` with:
- One command named "index" in view mode
- Basic metadata (title, description, icon)
- Raycast API dependency versioned at ^1.55.0
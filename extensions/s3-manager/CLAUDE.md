# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for managing S3 buckets. The extension allows users to interact with AWS S3 through the Raycast interface.

## Development Commands

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Fix linting issues automatically
- `npm publish` - Publish extension to Raycast Store

## Architecture

### Project Structure
- `src/` - Main source code directory
  - `list-buckets.tsx` - Main command component for listing S3 buckets
- `assets/` - Static assets including extension icon
- `package.json` - Raycast extension configuration and dependencies

### Framework & Technologies
- **Raycast API** (`@raycast/api`): Core framework for building Raycast extensions
- **TypeScript**: Primary language with React JSX support
- **React**: UI components using Raycast's component library (`List`, `ActionPanel`, `Detail`, etc.)
- **ESLint**: Code quality with Raycast's configuration (`@raycast/eslint-config`)

### Current Implementation
The extension currently has a placeholder implementation in `list-buckets.tsx` that shows a greeting message. The actual S3 integration functionality needs to be implemented.

### Key Raycast Concepts
- Commands are defined in `package.json` under the `commands` array
- Each command corresponds to a React component that exports a default function
- UI built using Raycast-specific components (`List`, `ActionPanel`, `Detail`, etc.)
- Actions are handled through `ActionPanel` with various `Action` types

## Configuration Files

- `tsconfig.json` - TypeScript configuration targeting ES2023 with React JSX
- `eslint.config.js` - ESLint configuration extending Raycast's rules
- `package.json` - Extension metadata, commands, and dependencies
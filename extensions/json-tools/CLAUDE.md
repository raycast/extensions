# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called "JSON Tools" that provides JSON parsing functionality. The extension is written in TypeScript with a single command `json-parse` that operates in no-view mode.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the extension for production using `ray build`
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Automatically fix linting issues
- `npm run publish` - Publish extension to Raycast Store

## Architecture

The extension follows Raycast's standard structure:
- Single TypeScript source file: `src/json-parse.ts` (currently empty - needs implementation)
- Standard Raycast extension configuration in `package.json`
- Uses Raycast API (`@raycast/api`) and utilities (`@raycast/utils`)
- TypeScript configuration targets ES2023 with React JSX support

## Key Files

- `src/json-parse.ts` - Main command implementation (currently empty)
- `package.json` - Extension manifest and dependencies
- `tsconfig.json` - TypeScript configuration for ES2023/CommonJS
- `eslint.config.js` - Uses Raycast's ESLint configuration

## Development Notes

- The main command file `src/json-parse.ts` is currently empty and needs implementation
- Extension uses "no-view" mode, meaning it likely operates on clipboard or selection
- Built with modern TypeScript (ES2023) and React JSX
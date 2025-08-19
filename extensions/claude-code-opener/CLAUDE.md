# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for quickly opening Claude Code sessions in selected directories. Built with TypeScript and React using the Raycast API.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (hot reload enabled)
npm run dev

# Build the extension
npm run build

# Run linter
npm run lint

# Fix linting issues automatically
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## Architecture

### Technology Stack
- **Raycast API**: Extension framework providing React components and hooks
- **React**: UI components with Raycast's custom component library
- **TypeScript**: Strict mode enabled with ES2023 target
- **@raycast/utils**: Utility hooks like `useFetch` and `useCachedState`

### Structure
- Single command `open-claude-code` in `src/open-claude-code.tsx`
- Extension manifest and metadata in `package.json`
- TypeScript configuration with strict mode in `tsconfig.json`
- Raycast ESLint configuration for code style

## Publishing Guidelines

Before publishing to the Raycast Store:
1. Test thoroughly using `npm run dev`
2. Ensure all linting passes with `npm run lint`
3. Update metadata in package.json (description, icon, author)
4. Run `npm run publish` to submit to Raycast Store

## Resources

- **Raycast Developer Documentation**: https://developers.raycast.com
- **LLM-friendly docs**: https://developers.raycast.com/llms.txt (comprehensive reference for development, troubleshooting, and publishing)
- **API Reference**: Available in the developer documentation
- **Example Extensions**: Study other extensions in the Raycast Store for patterns
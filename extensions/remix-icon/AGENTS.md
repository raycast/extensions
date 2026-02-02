# AI Agent Guidelines for Remix Icon Extension

> **Source of Truth**: This document is the authoritative reference for AI agents working on the Remix Icon Raycast extension. Symbolic links (CLAUDE.md, etc.) point to this file for tool-specific compatibility.

## 📋 Project Overview

A Raycast extension for searching and copying Remix Icon library icons in multiple formats (SVG, React, Vue, Data URI, Webfont).

**Stack**: TypeScript, React, Raycast API  
**Platform**: macOS only

## 🏗️ Key Architecture

### Core Files
- [src/search.tsx](src/search.tsx) - Main Grid view with search & filtering
- [src/IconActionPanel.tsx](src/IconActionPanel.tsx) - Copy actions for all export formats
- [src/utils.ts](src/utils.ts) - Icon name transformations, SVG loading
- [assets/catalogue.json](assets/catalogue.json) - **Generated file** (DO NOT EDIT MANUALLY)
- [assets/icons-compressed/](assets/icons-compressed/) - Compressed SVG data by category

### Icon Export Formats
- SVG, React/Vue Components, Data URI, Webfont HTML, CDN Link, NPM Install/Import

### Icon Names → Component Names
- Icon: `heart-fill` → Component: `RiHeartFill`
- Transformation: `toComponentName()` in [src/utils.ts](src/utils.ts)

## 🛠️ Development

```bash
npm run dev          # Development mode
npm run build        # Production build
npm run lint         # Lint check
npm run update-icons # Fetch latest Remix Icon release & regenerate catalogue
npm run validate     # Verify React/Vue component names match official packages
```

## 🚨 Critical Rules

**DO:**
- Use `catalogue.json` as source of truth (never edit manually)
- Run `npm run validate` after updating icon packages
- Keep TypeScript strict mode, use `readonly` types
- Memoize expensive computations, use Raycast Cache API

**DON'T:**
- Manually edit `catalogue.json` (use `npm run update-icons`)
- Commit `.local/` directory
- Hardcode icon lists
- Break icon name → component name mapping

## 📦 Version Sync

Keep these in sync:
- `assets/metadata.json` version
- `@remixicon/react` version in package.json
- `@remixicon/vue` version in package.json

After updating icons: `npm run update-icons && npm install -D @remixicon/react@X.X.X @remixicon/vue@X.X.X && npm run validate`

## 📚 Resources

- [Raycast API Docs](https://developers.raycast.com/api-reference)
- [Remix Icon](https://remixicon.com/)
- [@remixicon/react](https://www.npmjs.com/package/@remixicon/react)
- [@remixicon/vue](https://www.npmjs.com/package/@remixicon/vue)
- [Changelog Guide](https://developers.raycast.com/basics/prepare-an-extension-for-store#version-history)

---

**See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup and project structure.**  

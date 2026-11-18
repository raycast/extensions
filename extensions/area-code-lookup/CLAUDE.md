# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Raycast extension that looks up US/Canada area codes and international country codes, displaying location and current timezone information.

## Commands

```bash
npm run dev      # Start development mode (hot reload)
npm run build    # Build for production
npm run lint     # Run ESLint + Prettier
npm run fix-lint # Auto-fix lint issues
npm run publish  # Publish to Raycast Store
```

## Architecture

```
src/
├── lookup.tsx           # Main command - smart detection routes to area or country code
├── data/
│   ├── areaCodes.ts     # ~370 US/Canada area codes with state/province and timezone
│   └── countryCodes.ts  # ~200 international country codes with flag and timezone
└── utils/
    └── timezone.ts      # Formats current time in any IANA timezone
```

### Smart Detection Logic

The extension uses a single input field that auto-detects the code type:
- `+` prefix → always country code
- 3 digits → try area code first, fallback to country code
- 1-2 digits → country code only

### Data Structure

Area codes use `AreaCodeEntry` (code, state, abbreviation, country: "US"|"CA", timezone).
Country codes use `CountryCodeEntry` (code, country, flag, iso, timezone).

Both use a `Map` for O(1) lookup performance.

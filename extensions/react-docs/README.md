# React docs

## Description

A simple extension that allows users to be able to consult the new React documentation.

## Screencast

[![react-docs.png](https://i.postimg.cc/RhVMWSgS/react-docs.png)](https://postimg.cc/hz6FwBF6)

## Keeping Documentation Updated

This extension includes an automated script to fetch and update the React documentation entries from react.dev.

### Running the Update Script

To update the documentation to the latest version from React's website:

```bash
npm run update-docs
```

This script will:
- Fetch all API documentation from react.dev
- Extract hooks, components, APIs, and other reference pages
- Categorize them automatically
- Generate the `src/data/index.ts` file with all entries
- Display a summary of what was found

The script currently fetches documentation for:
- React Hooks (useState, useEffect, etc.)
- React Components (Fragment, Suspense, etc.)
- React APIs (cache, memo, lazy, etc.)
- Legacy APIs (Component, createElement, etc.)
- React DOM Components (form, input, etc.)
- React DOM APIs (createRoot, hydrateRoot, etc.)
- Resource Preloading APIs (preload, prefetch, etc.)
- Server APIs (renderToString, etc.)

### When to Run the Update

You should run the update script when:
- React releases new features or APIs
- You want to ensure the extension has the latest documentation links
- You notice missing documentation entries

After running the update script, make sure to:
1. Test the extension: `npm run dev`
2. Build the extension: `npm run build`
3. Verify that new APIs (like `cache`) appear in the search results

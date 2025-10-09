# NumPy Documentation Search

A Raycast extension that lets you search the NumPy API reference and preview detailed documentation without leaving Raycast. Results include function signatures, descriptions, parameters, and return values, with quick actions to open the official docs in your browser.

## Quick Start

```bash
npm install
npm run dev
```

The `ray develop` session (started through `npm run dev`) gives you hot reloading while you iterate on the command. Select "NumPy Docs" in Raycast to start searching.

## Available Commands

- **NumPy Docs** (`src/numpy-docs.tsx`): Search the NumPy Sphinx inventory locally, expand doc summaries inside Raycast, and open full pages on numpy.org when needed.

## Development Workflow

- `npm run dev`: Launch Raycast develop mode with live reload.
- `npm run build`: Validate and bundle the extension before publishing.
- `npm run lint`: Run Raycast's lint pipeline (requires internet access for schema validation).
- `npm run test`: Execute the Vitest suite covering search ranking and HTML parsing helpers.
- `npm run fix-lint`: Apply automatic fixes where available.

## Project Structure

```
src/
  numpy-docs.tsx         # Raycast command UI and state management
  lib/                   # Inventory, search ranking, and doc parsing utilities
  __tests__/             # Vitest specs and HTML fixtures
assets/                  # Extension icon
```

## Testing Notes

Unit tests rely on minimal HTML fixtures that mirror NumPy's documentation layout. When the upstream HTML changes, update the fixtures under `src/__tests__/fixtures/` to keep the parser in sync.

## Publishing

When you're ready to submit the extension, ensure:

1. `npm run build` passes without errors.
2. `npm run lint` is clean (requires network for Raycast schema validation).
3. The changelog reflects the new release and Raycast metadata matches the command behavior.

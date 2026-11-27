# Raycast Extension: GLPI

This is a Raycast Extension that allows users to view tickets and followups directly from Raycast.

## Project Structure
- `src/api/glpi/` - Contains classes used to manage communication with the GLPI API v2.
- `src/services/` - Contains backend services.
- `src/ui/` - Contains UI React code.
- `src/ui/components` - Contains shared UI React components.
- `src/ui/context.ts` - Contains code used for handling React context.
- `src/ui/keyboard.ts` - Contains all custom Raycast keyboard shortcuts.
- `src/ui/localstorage.ts` - Contains code for handling Raycast extension localstorage.
- `src/ui/types.ts` - Contains shared UI types.
- `src/*.tsx` - Contains Raycast commands implementing UI React components from `src/ui/*.tsx` files.

## Development Commands
- `npm run dev`: Starts the development server (using `ray develop`).
- `npm run lint`: Runs ESLint (using `ray lint`).
- `npm run fix-lint`: Runs ESLint with auto-fix (using `ray lint --fix`). Run is required before committing changes.
- `npm run build`: Builds the extension (using `ray build`). Run is required before committing changes.

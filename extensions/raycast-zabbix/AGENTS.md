# Raycast Extension: Zabbix

This is a Raycast Extension that allows users to perform common Zabbix tasks directly from Raycast, such as:
- View Problems, Hosts, Latest Data or Triggers.
- Acknowledge Problems.
- Disable or Delete Hosts.
- Disable or Change Severity of Triggers.
- Shortcuts for Open Event, Host, History Graph in Browser.
- Shortcuts for Copy Showed Values.

The main goal of this extension is to speed up frequently performed tasks that would otherwise require using Zabbix in a browser.

## Project Structure
- `src/api/zabbix/` - Contains classes used to manage communication with the Zabbix API.
- `src/ui/` - Contains UI React code.
- `src/ui/components` - Contains shared UI React components.
- `src/ui/cache.ts` - Contains code used for managing Raycast extension cache.
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

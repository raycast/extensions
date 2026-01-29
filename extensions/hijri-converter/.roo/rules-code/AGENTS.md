# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- **Form UI**: Use `useEffect` to update `Form.Description` for live previews during date selection.
- **UX Implementation**: Every conversion command must implement the sequence: `Clipboard.copy(result)` -> `showHUD("...")` -> `popToRoot()`.
- **Navigation**: Use `launchCommand` for jumping between extension commands (e.g., from Menu Bar items).
- **Types**: Always check `src/hijri-converter.d.ts` for custom type definitions when dealing with date conversion logic.
- **Validation**: Enforce strict month day limits (30/29) and the year 2000 cap in `src/utils.ts`.

# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- **Stack**: Raycast extension (TypeScript/React) using `@raycast/api` and `@raycast/utils`.
- **Calendar Logic**: Uses simplified arithmetic with hardcoded month lengths (30 for odd, 29 for even) in `src/hijri-calendar.tsx`.
- **Validation**: Strict validation enforces odd months = 30 days, even = 29 (except month 12), and caps Hijri year at 2000 in `src/utils.ts`.
- **UX Pattern**: Conversion commands MUST chain: Copy to clipboard -> Show HUD -> `popToRoot()`.
- **Navigation**: Uses `launchCommand` for cross-command navigation (e.g., from Menu Bar).
- **Types**: Custom type definitions for external libraries are located in `src/hijri-converter.d.ts`.

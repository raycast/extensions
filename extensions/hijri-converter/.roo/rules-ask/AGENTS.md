# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- **Stack**: Built as a Raycast extension using TypeScript, React, `@raycast/api`, and `@raycast/utils`.
- **Calendar Logic**: Uses a custom, simplified arithmetic model with hardcoded month lengths (30/29) in `src/hijri-calendar.tsx`.
- **Validation Constraints**: Hijri dates are strictly validated (odd=30, even=29) and capped at the year 2000.
- **UX Standards**: All conversion commands follow a strict Copy -> HUD -> `popToRoot()` sequence.
- **Navigation**: Command-to-command jumping is handled via `launchCommand`.

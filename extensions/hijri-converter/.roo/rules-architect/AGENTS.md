# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- **Architecture**: Command-based Raycast extension. Inter-command navigation must use `launchCommand`.
- **Logic Constraints**: Design around a simplified Hijri calendar (hardcoded month lengths) and a mandatory year 2000 cap.
- **UX Flow**: Architectural patterns must enforce the Copy -> HUD -> `popToRoot()` sequence for all conversion actions.
- **Type Safety**: Leverage `src/hijri-converter.d.ts` for extending external libraries.
- **Form Design**: Use `useEffect` driven descriptions for real-time feedback in `Form` components.

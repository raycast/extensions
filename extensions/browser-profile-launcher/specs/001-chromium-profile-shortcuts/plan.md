# Implementation Plan: Chromium Browser Profile Shortcuts

**Branch**: `001-chromium-profile-shortcuts` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-chromium-profile-shortcuts/spec.md`

## Summary

Build a Raycast extension that discovers all user profiles across
Chrome, Edge, Brave, Arc, and Vivaldi on macOS, displays them in a
searchable grouped list, and enables users to open, toggle (show/hide),
and create quicklink shortcuts for any profile. Profile metadata is
read from each browser's `Local State` JSON file. Window-level
show/hide toggle uses AppleScript via `osascript`. Quicklinks leverage
Raycast's `createDeeplink` + `Action.CreateQuicklink` to give profiles
first-class hotkey access.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting Node.js 18+
**Primary Dependencies**: `@raycast/api`, `@raycast/utils`
**Storage**: Raycast `LocalStorage` (profile cache + favorites)
**Testing**: `ray lint` + `ray build` as primary gates;
compile-time type checking via TypeScript strict mode
**Target Platform**: macOS (Raycast requirement)
**Project Type**: Raycast extension (desktop-app plugin)
**Performance Goals**: Profile list loads <1s; profile open/toggle <500ms
**Constraints**: Zero runtime dependencies beyond Raycast API;
no network calls; Accessibility permissions required for window toggle
**Scale/Scope**: 5 browsers, ~20 profiles max typical; single user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
| --------- | ------ | -------- |
| I. Raycast API Compliance | PASS | Two commands (`view` + `no-view`) declared in manifest. All UI uses `@raycast/api` components (`List`, `ActionPanel`, `Action`). Preferences declared in `package.json`. `ray lint` + `ray build` as build gates. |
| II. User Experience First | PASS | Searchable list with sections, <500ms toggle, quicklink creation in one action, informative empty/error states documented in spec edge cases. |
| III. Cross-Browser Extensibility | PASS | Browser registry as static data. Profile scanning isolated per browser via shared interface. Adding a browser = adding one entry to the registry. No browser-specific logic in UI or toggle code. |
| IV. Type Safety and Correctness | PASS | TypeScript strict mode. Typed `LaunchContext` interface for deeplinks. Filesystem data (JSON from `Local State`) validated at parse boundary. No `any` casts planned. |
| V. Simplicity and Minimal Footprint | PASS | Zero runtime deps beyond `@raycast/api` + `@raycast/utils`. `LocalStorage` for persistence. Two commands only. No abstractions beyond the browser provider interface (used by 5 browsers). |

**Post-Phase 1 re-check**: All principles still pass. The AppleScript
window manipulation adds complexity but is the simplest viable approach
for per-window control (documented in research.md section 4).

## Project Structure

### Documentation (this feature)

```text
specs/001-chromium-profile-shortcuts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── commands.md      # Phase 1 output — command & storage contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── browse-profiles.tsx       # Main list view command
├── open-profile.ts           # No-view command (quicklink target)
├── browsers.ts               # Browser registry (static data)
├── profiles.ts               # Profile scanning & caching logic
├── window-manager.ts         # AppleScript window detection & toggle
└── storage.ts                # LocalStorage helpers (favorites, cache)

assets/
├── extension-icon.png        # Extension icon
├── chrome.png                # Browser icons for list items
├── edge.png
├── brave.png
├── arc.png
└── vivaldi.png

package.json                  # Raycast manifest + commands + preferences
tsconfig.json                 # TypeScript strict config
```

**Structure Decision**: Raycast extension standard layout. All source
in `src/` at the root. No subdirectories needed — the extension is
small enough that 6 files keep it flat and navigable. Each file has a
single responsibility matching the data model and contracts.

## Complexity Tracking

> No constitution violations. No complexity justification needed.

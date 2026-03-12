<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial)
  Added sections:
    - Core Principles (5 principles)
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed (generic)
    - .specify/templates/spec-template.md ✅ no changes needed (generic)
    - .specify/templates/tasks-template.md ✅ no changes needed (generic)
  Follow-up TODOs: None
-->

# Browser Profile Launcher Constitution

## Core Principles

### I. Raycast API Compliance

All commands, views, and preferences MUST conform to the
Raycast Extensions API. The extension MUST pass `ray lint` and
`ray build` without errors before any merge. Extension manifest
(`package.json`) MUST declare all commands, preferences, and
required permissions accurately. No undocumented or private
Raycast APIs.

### II. User Experience First

Profile switching MUST feel instant — command-to-browser-open
in under 500ms on a modern Mac. The extension MUST surface
browser profiles in a searchable list with clear labels and
icons. Keyboard shortcut assignment MUST be intuitive: users
MUST be able to assign, reassign, and clear hotkeys without
leaving Raycast. Empty states and error messages MUST guide
the user toward resolution (e.g., "No profiles detected —
is Chrome installed?").

### III. Cross-Browser Extensibility

The architecture MUST support multiple Chromium-based browsers
(Chrome, Edge, Brave, Arc, Vivaldi) and SHOULD be designed so
adding a new browser requires only a new profile-detection
adapter — no changes to core shortcut or UI logic. Browser
detection and profile parsing MUST be isolated behind a
provider interface so each browser's filesystem quirks stay
contained.

### IV. Type Safety and Correctness

The project MUST use TypeScript in strict mode
(`"strict": true`). All Raycast API interactions MUST be
fully typed — no `any` casts unless justified with a comment.
Prefer the Raycast API's built-in hooks and utilities over
custom implementations. Data read from the filesystem (browser
profile directories, preference files) MUST be validated at
the boundary before use.

### V. Simplicity and Minimal Footprint

Avoid abstractions until they are needed in at least two
places. The extension MUST have zero runtime dependencies
beyond the Raycast API — no `node_modules` bloat. Prefer
Raycast's built-in storage (`LocalStorage`) over custom
persistence. Configuration surface MUST stay small: browser
selection and shortcut bindings, nothing more unless a clear
user need is demonstrated.

## Technology Constraints

- **Language**: TypeScript (strict mode)
- **Framework**: Raycast Extensions API (`@raycast/api`)
- **Platform**: macOS only (Raycast requirement)
- **Storage**: Raycast `LocalStorage` for shortcut bindings
  and user preferences
- **Build**: Raycast CLI (`ray develop`, `ray build`,
  `ray lint`)
- **Testing**: Compile-time type checking as primary gate;
  unit tests for profile-detection adapters where filesystem
  parsing is non-trivial
- **No** server-side components, no network calls beyond
  what the Raycast API itself provides

## Development Workflow

1. **Branch per feature** — one branch per spec, named
   `###-feature-name`.
2. **Spec before code** — every non-trivial change MUST have
   a spec (`/speckit.specify`) and plan (`/speckit.plan`)
   before implementation begins.
3. **Build gate** — `ray build` and `ray lint` MUST pass
   before a PR is opened. Broken builds block all other work.
4. **Small PRs** — each PR SHOULD address a single user story
   or a tightly scoped set of changes. Cross-cutting refactors
   get their own PR.
5. **Commit discipline** — commits MUST be atomic and
   descriptive. Squash-merge to main.

## Governance

This constitution is the authoritative source of project
principles. All design decisions, code reviews, and plan
validations MUST reference these principles.

- **Amendments** require updating this file, incrementing the
  version, and noting the change in the Sync Impact Report
  comment block above.
- **Versioning** follows semantic versioning: MAJOR for
  principle removals or incompatible redefinitions, MINOR for
  new principles or material expansions, PATCH for
  clarifications and wording fixes.
- **Compliance** is checked at two points: before Phase 0
  research (plan template Constitution Check) and during
  code review.

**Version**: 1.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12

# Architecture Decision Records

## ADR-001: Hybrid Integration Approach

**Status**: Accepted
**Date**: 2026-02-18

### Context

Velja exposes several integration surfaces:
1. **AppIntents** (via Shortcuts) — 10 actions for browser management and URL operations
2. **Preferences plist** — Full configuration including rules, browser lists, settings
3. **URL scheme** (`velja://`) — Open URLs through Velja
4. **System services** — macOS right-click services

We need to choose how to interact with Velja from a Raycast extension (Node.js/TypeScript).

### Decision

Use a **hybrid approach**:
- **Shortcuts CLI** (`shortcuts run`) for actions that have AppIntents (set/get browsers, open URLs, remove tracking params)
- **Plist read** (`defaults read`) for reading configuration, rules, and browser lists
- **Plist write** (`defaults write`) for managing rules (create, edit, toggle, delete)

### Rationale

- **Shortcuts for actions**: These are Velja's official API surface. Using them ensures compatibility across versions and respects the app's sandboxing. They handle validation and state management internally.
- **Plist for rules**: There are no Shortcuts actions for rule management. The plist is the only way to programmatically create, edit, or delete rules. Reading it is safe; writing requires care around caching.
- **Not URL scheme only**: The `velja://` scheme is limited and not well-documented for advanced operations.

### Consequences

- Users may need to create Shortcuts wrappers for some actions (or we pre-create them)
- Plist writes may require cache flushing (`killall cfprefsd`) and app reload
- We depend on Velja's internal plist schema, which could change between versions
- Need to document the required Shortcuts setup for users

### Alternatives Considered

1. **Plist only** — Would work for everything but is fragile and may not trigger Velja's internal state updates
2. **Shortcuts only** — Cannot manage rules; limited read capabilities
3. **AppleScript** — Velja has no AppleScript dictionary; would just be a wrapper around Shortcuts anyway

---

## ADR-002: Raycast Extension Architecture

**Status**: Accepted
**Date**: 2026-02-18

### Context

Raycast extensions are built with TypeScript/React and run in a Node.js environment. We need to define the command structure and shared utilities.

### Decision

Structure the extension as:

```
src/
  commands/           # Raycast commands (one file per command)
    list-browsers.tsx
    set-default-browser.tsx
    list-rules.tsx
    create-rule.tsx
    open-url.tsx
    ...
  lib/                # Shared utilities
    velja.ts          # Velja detection, plist reading
    shortcuts.ts      # Shortcuts CLI wrapper
    rules.ts          # Rule CRUD operations
    types.ts          # TypeScript interfaces
    browsers.ts       # Browser name/icon resolution
  assets/             # Icons and images
```

### Rationale

- One command per file follows Raycast conventions
- Shared `lib/` prevents duplication across commands
- Types in a central file ensure consistency with Velja's data model
- Separating Shortcuts runner from plist reader keeps concerns clean

---

## ADR-003: Rule Management via Plist Modification

**Status**: Accepted (with caveats)
**Date**: 2026-02-18

### Context

Velja stores rules as JSON-encoded strings in an array within its preferences plist. There is no API or Shortcuts action for rule CRUD.

### Decision

Read and write rules directly via `defaults read/write com.sindresorhus.Velja rules`.

### Implementation Notes

1. **Reading**: Parse the plist array, JSON-decode each string entry
2. **Writing**: JSON-encode each rule, write the full array back
3. **Atomicity**: Always read-modify-write the entire rules array (no partial updates)
4. **IDs**: Generate UUID v4 for new rules and matchers (matching Velja's format)
5. **Cache flush**: After writes, run `killall cfprefsd` to flush macOS preference cache
6. **Validation**: Validate rule schema before writing to prevent corruption

### Risks

- **Schema changes**: Velja updates could change the rule format. Mitigate by validating strictly and failing gracefully.
- **Cache coherence**: Velja may hold rules in memory. Changes may not take effect until Velja is relaunched.
- **Race conditions**: If user edits rules in Velja UI simultaneously, data could be lost. Mitigate by reading fresh before each write.

### Testing Strategy

- Test against a copy of the plist, never against production preferences during development
- Verify rules appear in Velja UI after programmatic creation
- Test enable/disable toggle round-trips

# Merriam-Webster Raycast Extension Design

Date: 2026-04-21
Status: Proposed

## Goal

Build a Raycast extension for Merriam-Webster's Learner's Dictionary using the provided API key. The first version should support both live search and exact lookup, handle spelling suggestions inline, and present as much useful learner-oriented information as the API can provide without making the interface noisy or hard to scan.

## Scope

In scope:

- A Raycast extension project scaffolded for local development
- Learner's Dictionary support only
- A live search command
- An exact lookup command
- Extension preferences for storing the Learner API key
- Shared API, parsing, and formatting utilities
- Rich detail rendering for entries
- Inline display of spelling suggestions returned by the API
- Actions for copying useful content and retrying requests

Out of scope:

- Collegiate or other Merriam-Webster dictionaries
- User accounts, syncing, or analytics
- Offline caching
- Favorites, history, or recents
- Publishing to the Raycast Store in this phase

## User Experience

### Command 1: Live Search

The primary command provides a searchable `List` that updates as the user types. It should:

- Query the Learner API with the current search text
- Show dictionary entries when the API returns entry objects
- Show spelling suggestions in the same list when the API returns suggestion strings
- Use the detail pane to render a rich Markdown summary for the selected item
- Let users act on the selected result without leaving the command

The list should feel responsive, tolerate empty and loading states gracefully, and avoid flashing or losing context when results refresh.

### Command 2: Exact Lookup

The secondary command accepts a single term and performs a direct lookup after submission. It should:

- Fetch once using the provided term
- Show a focused result view for direct lookup
- Fall back to suggestions if no entry is returned
- Reuse the same rendering and actions as the live search flow when possible

This command is useful for users who want a deterministic lookup flow rather than live-updating results.

### Suggestions

Suggestions should appear inline in the result list rather than in a separate screen. Selecting a suggestion should re-run the search using that suggestion so the interaction remains fluid.

## Data Handling

The Learner API can return either:

- Entry objects for successful matches
- Strings representing spelling suggestions for unsuccessful matches

The extension will normalize these responses into a small internal model:

- `EntryResult` for dictionary entries
- `SuggestionResult` for suggestion rows

This keeps command components simple and avoids spreading Merriam-Webster response handling across the UI.

## Detail Rendering

The detail pane should prioritize clarity over raw completeness while still surfacing rich information.

When present, the rendered detail should include:

1. Headword
2. Functional label or part of speech
3. Pronunciation
4. Audio availability or pronunciation action if audio can be derived reliably
5. Definitions and nested senses
6. Usage examples
7. Usage notes or learner-specific notes
8. Short metadata that improves interpretation without clutter

The output format should be Markdown generated from normalized entry data. Formatting logic should live in a shared utility so both commands render entries consistently.

## Preferences

The extension will define an extension-level preference for the Learner API key. The key should be stored through Raycast preferences rather than hard-coded into the repository.

The provided key will be used for local setup and validation:

- Learner API key: `3b10486e-e0d9-49b8-bcdc-21d5a843c893`

The implementation should read the key from preferences at runtime so another key can be substituted later without code changes.

## Actions

Initial actions should include:

- Copy headword
- Copy formatted definition text
- Retry or refresh the request
- Open the Merriam-Webster website for the selected headword if a stable URL can be generated safely

If audio playback proves straightforward with the available Raycast APIs and the Learner response format, it can be included in this phase. If it introduces unreliable behavior or extra complexity, it should be deferred.

## Architecture

Recommended project structure:

- `src/search-learner.tsx`
- `src/lookup-learner.tsx`
- `src/api/merriamWebster.ts`
- `src/lib/formatEntry.ts`
- `src/types.ts`

Responsibilities:

- Command files own UI flow and command-specific state
- API module owns HTTP requests, preference access, and response normalization
- Formatting module owns Markdown generation and any small presentation helpers
- Shared types define normalized result shapes used across the extension

This split keeps the UI thin and makes future changes easier, even though v1 only targets the Learner dictionary.

## Error Handling

The extension should handle:

- Missing API key
- Network failures
- Empty query input
- No results
- Suggestion-only responses
- Unexpected API response shapes

Errors should be shown in a user-friendly way inside the Raycast UI rather than surfacing raw stack traces.

## Implementation Notes

- Prefer Raycast's current React-based command model
- Use a shared fetch wrapper for API access
- Reuse normalized models and formatting code between commands
- Keep the first version intentionally small and reliable
- Avoid adding caching or persistence until the base lookup experience feels solid

## Success Criteria

The first version is successful when:

1. The extension runs locally in Raycast
2. The user can store the Learner API key in preferences
3. Live search returns entries and inline suggestions
4. Exact lookup returns a focused result for a submitted term
5. The detail pane renders useful learner-oriented information clearly
6. Common actions like copy definition and open in browser work

## Risks and Decisions

### API Shape Complexity

Merriam-Webster dictionary payloads can be structurally dense. To reduce UI fragility, we will normalize the subset of fields needed for v1 instead of rendering the raw response format directly.

### Audio Support

Pronunciation audio may require deriving a media URL from response fields. This is only worth including if the derivation is reliable and the resulting UX is simple.

### Website Links

Opening Merriam-Webster in the browser depends on a stable public URL pattern for learner entries. If the headword-to-URL mapping is ambiguous, the browser action should fall back to a search URL rather than a possibly broken direct-entry link.

## Next Step

After this spec is approved, the next step is to create an implementation plan and then scaffold the extension and shared modules according to this design.

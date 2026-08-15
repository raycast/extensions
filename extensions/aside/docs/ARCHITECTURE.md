# Architecture

## Capability baseline

The implementation was verified against Aside 1.0.728.1 (`CFBundleVersion` 728.1) and Aside 1.0.813.1, whose bundle identifier is `at.studio.AsideBrowser`. Its scripting dictionary exposes:

- text IDs for windows, tabs, bookmark folders, and bookmark items;
- window mode (`normal` or `incognito`) and writable active-tab index;
- tab title, URL, loading state, reload, and close;
- bookmarks bar and other bookmarks roots.

The app requires macOS 12 or later and declares `NSAppleScriptEnabled` with `scripting.sdef`.

## Layers

1. `src/lib/browser.ts` is the only AppleScript boundary. It targets the bundle ID, ensures a usable window, returns JSON, and validates window/tab IDs before mutations.
2. `src/hooks` cache list reads and expose Raycast loading/revalidation state.
3. `src/components` provide shared list items, errors, and keyboard actions.
4. Command entry points select a primary action or call one adapter method.

All untrusted dynamic strings are escaped before interpolation. AppleScript response strings escape backslashes, quotes, tabs, newlines, returns, backspace, and form-feed while preserving Unicode. TypeScript parses every response at the boundary.

## Reference review

- **Google Chrome:** shared typed action layer, reusable list items, dedicated error views, command metadata, AI eval structure, and Store scripts.
- **Dia:** typed tab/bookmark components, cached hooks, search-engine preference, native application opening, empty states, and version guidance.
- **Arc:** native tab IDs, shared AppleScript adapter, reload/close/focus actions, optimistic refresh behavior, AI tool schemas, and eval examples.

The extension intentionally does not copy Dia or Arc's history/database readers. History and downloads remain deferred until Aside exposes a stable supported API.

## Raycast AI tools

Files under `src/tools` are thin, composable wrappers over `src/lib/browser.ts`. Read tools return native IDs; mutation tools require those IDs and therefore retain stale-reference protection. `close-tabs` re-fetches current tabs, resolves and deduplicates native IDs, rejects stale IDs before confirmation, displays current titles and URLs in one destructive confirmation, then reports successful and failed closes separately.

The AI layer does not launch the Aside CLI and cannot destabilize the extension with a hanging child process. Tab and bookmark outputs default to bounded result sets, and manifest instructions direct Raycast AI to search narrowly. Manifest instructions explicitly describe unsupported spaces/profiles and page summarization so Raycast does not claim capabilities absent from Aside's dictionary.

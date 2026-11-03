# Cosign extension: notes for contributors

Paths are repo-relative on purpose: this file ships to `raycast/extensions`.

## How it talks to Cosign

- `src/lib/cosign-mcp.ts` is the only network layer. It speaks MCP over HTTP to `https://api.cosign.co/mcp`
  and signs in with OAuth PKCE and dynamic client registration. The authorize and token requests send
  `resource=https://api.cosign.co/mcp`.
- `callTool` opens one initialized session per command process and injects `llm_model` into every call.
  Every tool call also needs a `reason_for_call` string.
- The scope is `member:read member:write`. Write access is used only for favorites. Changing `SCOPE` forces a
  re-registration and one re-consent.
- `src/lib/api.ts` wraps the read tools; `src/lib/types.ts` holds the response shapes we have observed.

## Rate limits

`search_*` and the list-writing tools share one AI budget of 3 per minute, 20 per hour and 60 per day. Searches are
therefore explicit (Enter), pagination is explicit ("Load More"), and nothing in the search commands fetches a next page on its own.
The investments view pages by scroll (`usePromise` pagination).

## Favorites

Favorites live in two private Cosign lists, "Raycast Favorites: People" and "Raycast Favorites: Companies"
(`src/lib/favorites.ts`). The list ids are cached in LocalStorage. People are removed by `nomineeId`; a company entry
is removed by the list entry's wrapper `nominee.nomineeId`, not by `organizationId`. Cosign refuses investing firms
in the companies list.

## UI conventions

- `src/components/SearchList.tsx` drives all three search commands: Enter to search, the bar clears and results stay
  so typing filters them, and the selected row's profile loads after a 250 ms debounce.
- `src/components/view-actions.tsx` holds the "View" action section: Toggle Sidebar and Show/Hide Description.
  The description setting is one shared `useCachedState` key, so it applies in every list.
- `src/components/investments.tsx` groups an investors list into one section per round, newest first, then by
  amount. Rows with no round go in a "Stage Unknown" section at the bottom.

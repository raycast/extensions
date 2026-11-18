# HeyClaude Changelog

## [Trending Resources, Recent Updates, and PR-first submissions] - 2026-06-07

- Add the `Trending Resources` command for registry entries with public
  activity signals.
- Add the `Recent Updates` command for recently added, updated, or removed
  HeyClaude entries.
- Use server-backed registry search for typed queries with paginated results.
- Refresh feed and detail caches from registry manifest signatures so stale
  detail payloads are invalidated when the feed changes.
- Load full copy text from HeyClaude LLM detail payloads when compact detail
  JSON omits the copy body.
- Route submit and suggest-change actions through HeyClaude's PR-first
  submission flow.
- Refresh Store screenshots, icon assets, and HeyClaude repository links.

## [Initial Store Release] - 2026-05-25

- Add the `Search HeyClaude` command.
- Browse the public HeyClaude directory by category.
- Copy or paste full Claude assets, install commands, and config snippets.
- Add structured detail metadata, share actions, Quicklink creation, and
  opt-in Snippet creation for install/config payloads.
- Save local favorites using Raycast LocalStorage.
- Rank frequently used entries and jobs locally with Raycast frecency sorting.
- Cache the public feed and per-entry details for resilient read-only search.
- Add dedicated `Submit New Content` and `Get Involved with HeyClaude`
  commands while keeping contribution paths browser/issue-first.

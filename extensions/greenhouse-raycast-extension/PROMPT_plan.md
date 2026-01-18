0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/` to understand shared utilities & components.
0d. Study @AGENTS.md for build/test commands.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use subagents to study existing source code in `src/*` and compare it against `specs/*`. Analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Consider searching for TODO, minimal implementations, placeholders, and inconsistent patterns.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first.

ULTIMATE GOAL: We want to complete the UX polish and caching features for this Greenhouse Raycast extension. This includes: launching directly into jobs list, improving stage presentation with counts, updating the icon, adding caching with useCachedPromise, and adding a background refresh command.

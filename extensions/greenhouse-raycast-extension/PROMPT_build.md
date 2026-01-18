0a. Study `specs/*` to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md for current tasks.
0c. Study @AGENTS.md for build/test commands.
0d. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented).

2. After implementing functionality, run the tests and validation commands from @AGENTS.md. If functionality is missing then add it per the specifications.

3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings. When resolved, update and remove the item.

4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

99999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
999999. Keep @IMPLEMENTATION_PLAN.md current with learnings — future work depends on this.
9999999. When you learn something new about how to run the application, update @AGENTS.md but keep it brief.
99999999. Implement functionality completely. Placeholders and stubs waste efforts.
999999999. When @IMPLEMENTATION_PLAN.md becomes large, periodically clean out completed items.
9999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates belong in @IMPLEMENTATION_PLAN.md.

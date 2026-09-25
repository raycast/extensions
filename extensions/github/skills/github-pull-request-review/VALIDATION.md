# Public API validation

Checked on September 24, 2026 with Node 24.12.0 and npm 11.6.2. The manifest and lockfile resolve the public `@raycast/api` 2.5.0 release. No PR, push, or publication is part of this change.

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed, including bundled-skill validation |
| `npm run test` | Passed |

Manifest tool registrations, existing AI instructions/evals, and runtime source are unchanged. All bundled `SKILL.md` files have matching names and directories and stay within 30–90 lines.

## Raycast runtime

The current checkout was imported with `ray develop`. The registered **Review Pull Requests** skill appeared in Raycast AI Chat and was explicitly selected; its named chip was visible in the submitted message.

**Prompt:** Review https://github.com/raycast/extensions/pull/31451 for concrete bugs using its diff, and summarize its CI status. Report coverage limits and tests not run. Keep the answer under 200 words. Do not post comments or change the PR.

**Observed result:** The extension displayed “Connect your GitHub account” with “Sign in with GitHub.” The test was canceled after repeated authentication prompts. No PR review, CI result, or successful diff retrieval was produced. This is a blocked test, not a passing transcript.

The other two scenarios in [UPSTREAM.md](UPSTREAM.md) remain unexecuted. Full live three-prompt acceptance requires signing in to this local development extension and rerunning the review scenarios. Static tool inspection and three existing automated tests confirm that `get-pull-request-diff` is implemented, but do not establish live authenticated behavior.

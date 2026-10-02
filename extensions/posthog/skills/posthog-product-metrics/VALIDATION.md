# Public API validation

Checked on September 24, 2026 with Node 24.12.0 and npm 11.6.2. The manifest and lockfile resolve the public `@raycast/api` 2.5.0 release. No PR, push, or publication is part of this change.

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed, including bundled-skill validation |
| Automated tests | No test script is configured |

Manifest tool registrations, existing AI instructions/evals, and runtime source are unchanged. All bundled `SKILL.md` files have matching names and directories and stay within 30–90 lines.

## Raycast runtime

Live three-prompt acceptance for this exact local bundle is not complete. The scenarios in UPSTREAM.md are a manual test plan, not executed transcripts. Build/lint and automated results above do not establish live authentication or skill selection.

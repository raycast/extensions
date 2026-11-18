# Public API validation

Checked on September 24, 2026 with Node 24.12.0 and npm 11.6.2. The manifest and lockfile resolve the public `@raycast/api` 2.5.0 release. No PR, push, or publication is part of this change.

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed, including bundled-skill validation |
| Automated tests | No test script is configured |

Manifest tool registrations, existing AI instructions/evals, and runtime source are unchanged. All bundled `SKILL.md` files have matching names and directories and stay within 30–90 lines.

## Raycast runtime

Three requests completed in Raycast AI Chat. These smoke checks used the selected Exa integration; its source checkout and loading of this exact bundled skill were not independently verified, so they are not full acceptance of the local bundle.

1. **Prompt:** “Compare SQLite and DuckDB for analyzing local CSV files. Find primary sources, summarize the tradeoffs, and link every source.” **Observed:** Search Tools, two Search Deep calls, and six Search calls; a comparison with ten primary-source links. Response excerpt: “Choose DuckDB when the CSV is primarily an analytical dataset and you want to run exploratory SQL directly against one or many files.”
2. **Prompt:** “Use Exa to retrieve https://duckdb.org/docs/stable/data/csv/auto_detection.html and summarize how CSV type inference can go wrong. Use the retrieved page, provide its source link, and keep the answer under 100 words.” **Response:** “Exa retrieved only a redirect page, not the documentation content, so I can’t reliably summarize the source. Please paste the page text or confirm that I should proceed using DuckDB’s indexed documentation instead.”
3. **Prompt:** “Use Exa to check https://example.invalid/unpublished-product-spec and tell me whether it supports the claim that the product guarantees zero data loss. Keep the answer under 80 words and distinguish inaccessible evidence from a disproven claim.” **Response:** “The evidence is inaccessible: Exa could not retrieve https://example.invalid/unpublished-product-spec. Therefore, it neither supports nor disproves the claim that the product guarantees zero data loss.”

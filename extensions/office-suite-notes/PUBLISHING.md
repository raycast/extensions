# Publication checklist

- Confirm the manifest author is the maintainer's actual Raycast username, not merely their GitHub username.
- Use Node.js >=22.22.2. Run `npm ci`, `npm test`, `npm run build`, `npm run lint`.
- Import via `npm run dev`; enter the API token **only** in extension preferences.
- Manually verify connection, searching, pagination, folder navigation and rendering; use synthetic notes for create/append tests and screenshots.
- Capture genuine Raycast screenshots with synthetic data, no credentials or real note content. Do not fabricate evidence of runtime testing.
- Recheck uniqueness in the Store and open PRs.
- Run `npm run publish` or submit a PR adding this folder under `extensions/office-suite-notes` in `raycast/extensions`.
- A draft/awaiting-review PR is not a published Store listing. Address reviewer feedback before approval.

The repository contains no real token and no real note fixtures. Do not attach CLI output containing private data to a public PR.

## Current blockers

The manifest currently uses the authenticated GitHub username `Daryl9441` as an **unverified placeholder**. A Raycast CLI login and confirmed Raycast username are required before marking a PR ready. The initial local author candidate was rejected by the Raycast user validator. No real UI screenshots or authenticated extension runtime tests have been performed.

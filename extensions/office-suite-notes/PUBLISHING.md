# Publication checklist

- Confirm the manifest author is the maintainer's actual Raycast username.
- Use Node.js >=22.22.2. Run `npm ci`, `npm test`, `npm run build`, `npm run lint`.
- Import via `npm run dev`; enter the API token **only** in extension preferences.
- Manually verify connection, searching, pagination, folder navigation and rendering; use synthetic notes for create/append tests and screenshots.
- Capture genuine Raycast screenshots with synthetic data, no credentials or real note content.
- Recheck uniqueness in the Store and open PRs.
- A draft/awaiting-review PR is not a published Store listing.

The repository contains no real token and no real note fixtures.

## Status

- Raycast username confirmed via `npx ray profile`: `DarylZhong`.
- GitHub username `Daryl9441` is the fork owner, not the Store author field.
- Automated tests, TypeScript, and local Raycast build have passed.
- Authenticated in-Raycast UI screenshots remain a Store requirement if reviewers request them.

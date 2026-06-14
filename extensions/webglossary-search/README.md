# WebGlossary for Raycast

Search [WebGlossary.info](https://webglossary.info/) — the largest web development glossary — without leaving your keyboard. Type a term and the top result opens its definition page directly; anything without an exact match falls back to full-text search.

## Why an extension and not a Quicklink

WebGlossary term pages live at `/terms/{slug}/`, where the slug is lowercased and hyphenated (`google-developer-expert`). Space-encoded paths (`/terms/google%20developer%20expert/`) are unreliable — they resolve for some terms and 404 for others. Raycast Quicklinks can percent-encode an argument but can't convert spaces to hyphens, so a Quicklink can't reliably hit term pages from natural typing. This extension normalizes the slug in code (`replace(/\s+/g, "-")`) and probes whether the page exists before choosing the default action.

## Develop

```bash
npm install
npm run dev      # hot-reloads into Raycast; find it as "Search Glossary"
```

## Publish to the Raycast Store

1. Set `author` in `package.json` to your Raycast username.
2. Add a 512×512 PNG at `assets/command-icon.png` (the Create Extension scaffold ships one you can keep).
3. Run `npm run lint` and fix anything flagged.
4. Run `npm run publish` — this opens a PR against the public [`raycast/extensions`](https://github.com/raycast/extensions) monorepo. Once merged, it's in the Store and the source is public on GitHub.

## Note on existence checks

The "Found" indicator assumes the site returns a real non-200 status (or redirects away) for unknown slugs. If WebGlossary ever serves a soft 404 (a `200` page that says "not found"), tighten the `parseResponse` check in `src/search-glossary.tsx` to inspect the response body instead of just the status.

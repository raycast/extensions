# CLAUDE.md

This project's agent guidance lives in **[AGENTS.md](AGENTS.md)** — read it first. It covers setup, the build/lint/test gate, architecture, and hard constraints.

Most important rules (do not violate):

- **Run the full gate before committing:** `npx tsc --noEmit`, `node scripts/check-urls.mjs`, `npm run lint`, `npm run build` — all must pass. Trust `ray lint` over `ray build`.
- **`package.json` `license` must stay `"MIT"`** (Raycast requirement; GPL/etc. break `ray lint` and the Store).
- **Icons in `assets/` must be 512×512 PNG files** — built-in icon ids and `.svg` fail `ray lint`.
- **Never fire the paid Kagi Search API per keystroke** — it runs only on Enter; autosuggest is the free, debounced endpoint.
- Keep changes minimal; match existing patterns; don't add dependencies casually; don't commit secrets.

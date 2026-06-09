# Maintenance

## Validation

Use these checks before pushing:

```bash
npm run check
```

`npm run check` runs `npm run lint` and `npm run build`. The default lint command uses a local Raycast API stub with Raycast relaxed mode so local validation is not blocked by Raycast schema or author lookups when a development environment cannot reach `www.raycast.com`.

Before cutting a release, run the full online Raycast validation from a network that can reach Raycast:

```bash
npm run check:release
```

Run commands separately when narrowing a failure:

```bash
npm run lint
npm run lint:release
npm run build
```

`npm run build` writes to the ignored `dist/` folder. Do not commit `dist/`.

## FMHY Data Maintenance

The extension fetches the public single-page markdown index from `https://api.fmhy.net/single-page`. Parsing and URL normalization are split across:

- `src/lib/parser.ts`: heading/category traversal, link extraction, notes, related links, and normalized results.
- `src/lib/fmhy-url.ts`: FMHY page route aliases, Reddit wiki redirect conversion, generated category URL normalization, and anchor slugging.
- `src/lib/cache.ts`: cache key/version, cache validation, freshness checks, and legacy migration.

When FMHY moves pages or renames anchors, update `src/lib/fmhy-url.ts` first. Keep route aliases centralized there so UI code only calls helpers such as `normalizeFmhyGeneratedCategoryUrl()`.

## Cache Changes

Current cache schema is version 4 under key `fmhy-index-v4`. The stored payload is:

```ts
{
  version: 4;
  timestamp: number;
  index: {
    results: FmhyResult[];
    categories: FmhyCategory[];
  };
}
```

If the persisted data shape changes, bump the cache version, update type guards, and add a migration path when old cached data can still be displayed safely. Legacy v3 payloads are currently migrated into a v4-compatible index and marked `isLegacy` so the command prompts the user to refresh.

## UI Behavior Checks

After changing `src/search-fmhy.tsx`, manually inspect these flows in Raycast dev mode:

- Cached index loads immediately and shows fresh/stale/legacy status.
- `Refresh Index` works from the action menu and uses the common refresh shortcut.
- Category links open normalized `fmhy.net` URLs.
- Category notes open in a pushed detail view.
- Quick links for X/Twitter, Discord, GitHub, GitLab, Telegram, and Reddit stay in the action panel.
- Non-social related links open through the pushed related-links list and show a count accessory on the result.
- `Load More Results` briefly selects the first newly loaded result, then normal arrow-key navigation stays native without repeated programmatic recentering.

## Repository Hygiene

Before committing:

```bash
git status
git diff
```

Only commit source, docs, package metadata, lockfile changes, and asset changes that belong to the current task.

## Sensitive Information Check

Before pushing, scan the files that would be committed:

```bash
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!package-lock.json' '(ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN [A-Z ]+-----|Authorization: Bearer [A-Za-z0-9._-]+)'
```

If the scan reports real credentials, remove them before staging and rotate the credential outside this repository.

## Raycast Manifest

The `package.json` manifest declares the commands, supported platforms, and Raycast metadata. Keep `platforms` set to both `macOS` and `Windows` while the extension is intended to work on both platforms.

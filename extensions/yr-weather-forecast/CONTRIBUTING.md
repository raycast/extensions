# Contributing

## Development

```bash
npm install
npm run dev        # start Raycast dev server
npm run check      # full verify: build + type-check + lint + format
```

## Raycast Extensions Monorepo Sync

This repository (`kyndig/yr-wfc`) is the source of truth. When updating the extension in the Raycast Extensions monorepo:

1. Copy `src/`, `assets/`, `metadata/` to the monorepo extension directory
2. Copy `README.md` and `CHANGELOG.md`
3. Verify the monorepo `package.json` repository/bugs URLs point to `https://github.com/kyndig/yr-wfc`
4. Keep the `{PR_MERGE_DATE}` placeholder in CHANGELOG (Raycast CI fills it on merge)
5. Confirm extension listing fields (title, subtitle, description, repo link) match this repo

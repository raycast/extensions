# Raycast Store Publish Checklist

## Required

- [ ] **Extension icon** — Add `extension-icon.png` (512x512 or 1024x1024) to root directory (missing)
- [ ] **Author** — Ensure `"author"` in `package.json` is your Raycast username
- [ ] **Screenshots** — Add 1-6 screenshots to `metadata/` folder (1270x846 or 2540x1692) (missing)

## Recommended

- [ ] **Categories** — Verify categories in `package.json` match your use case
- [ ] **Test all commands** — Run `npm run dev` and verify each command works

## Publish

```bash
npm run publish
```

This will validate and submit to the Raycast Store for review.

## Reference

https://developers.raycast.com/basics/publish-an-extension

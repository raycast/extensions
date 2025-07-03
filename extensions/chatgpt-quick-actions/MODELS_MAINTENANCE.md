# Models Maintenance

This extension uses a consolidation system to maintain model lists in a single location.

## Adding New Models

1. Edit `scripts/models.js`
2. Update [pricing](https://platform.openai.com/docs/pricing) in `src/util.ts`
3. Run `npm run build-package`
4. Update `CHANGELOG.md`

## Files

- `scripts/models.js` - Single source of truth
- `package.template.json` - Template with placeholders
- `scripts/build-package.js` - Build script
- `package.json` - Generated (do not edit manually)

## Merge Conflicts

If multiple PRs modify models simultaneously, resolve conflicts in `scripts/models.js` only, then run `npm run build-package` to regenerate `package.json`. 
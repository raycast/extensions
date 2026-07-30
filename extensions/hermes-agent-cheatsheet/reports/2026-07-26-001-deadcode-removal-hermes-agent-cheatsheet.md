# deadcode: Hermes Agent cheatsheet repository

**Scope:** Entire repository, excluding dependencies, lock content, generated catalog data, and the pre-existing dirty set
**Stack:** TypeScript/React Raycast extension, Node.js scripts and tests, npm
**Verification:** `npm run validate`; `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` — baseline: green
**Working tree:** verification-green
**Change set:** staged, awaiting review

## Removed

### Batch 1 — unused catalog projections

- `src/data/index.ts:sourceMetadata` — unreferenced binding; whole-repository search found no consumer, and the Raycast manifest exposes only the default command entrypoint.
- `src/data/index.ts:cheatsheetSections` — unreferenced derived catalog; whole-repository search found no consumer or convention-based loader.
- `src/types.ts:CheatsheetSection` — type-only declaration used exclusively by the dead `cheatsheetSections` binding.
- `src/data/categories.ts:CATEGORIES[*].description` — thirteen values and their property contract were read exclusively while constructing the dead `cheatsheetSections` value.

**Verification:** green — 33 tests, Raycast lint, production build, strict TypeScript, and unused-local/parameter checks passed.

### Batch 2 — unreachable generator and presentation paths

- `scripts/sync-hermes-docs.mjs:URLS.config` — private object property with zero whole-repository member accesses and no computed access to `URLS`.
- `scripts/sync-hermes-docs.mjs:URLS.providers` — private object property with zero whole-repository member accesses and no computed access to `URLS`.
- `scripts/sync-hermes-docs.mjs:createItem.notes` — no call site supplied the parameter, the generated catalog contains no `notes` field, and no alternate catalog source exists.
- `src/types.ts:CheatsheetItem.notes` — schema member reachable only through the generator path proven dead above.
- `src/lib/filter.ts:item.notes` — searchable value unreachable because the authoritative catalog cannot emit `notes`.
- `src/lib/markdown.ts:item.notes` — rendering branch unreachable because the authoritative catalog cannot emit `notes`.

**Verification:** green — 33 tests, Raycast lint, production build, strict TypeScript, and unused-local/parameter checks passed.

## Held back (Uncertain)

- `src/types.ts:CATEGORY_IDS` export modifier — removing it caused `@typescript-eslint/no-unused-vars` to fail because the value is then used only as a type. The entire export-removal batch was rolled back. **To confirm:** establish a lint-compatible representation in a separate refactoring task.
- `src/lib/filter.ts:getSearchableText` export modifier — no external consumer was found, but its batch was not independently verified after the `CATEGORY_IDS` lint regression. **To confirm:** retry as an isolated dead-export batch.
- `src/lib/catalog-history.ts:CatalogHistorySnapshot` and `CatalogHistoryStore` export modifiers — no imports were found, but their batch was not independently verified after the `CATEGORY_IDS` lint regression. **To confirm:** retry as an isolated dead-export batch.
- `src/lib/examples.ts:ModelPersonalizationState` and `PrimarySelection` export modifiers — no imports were found, but their batch was not independently verified after the `CATEGORY_IDS` lint regression. **To confirm:** retry as an isolated dead-export batch.

## Referred out

- `metadata/hermes-agent-cheatsheet-{1,2,3}.png` — Store screenshots are convention-loaded and therefore alive, but they show stale icon/count/UI state and should be recaptured separately without using Computer Use → mc-bug-hunt

## Summary

Removed: 3 dead bindings/types, 15 unused data properties, and 5 unreachable schema/rendering declarations or branches; 0 files and 0 dependencies. Held back: 6 unused-export candidates. Assumptions: defaulted scope to the repository root; treated the Raycast command and Store metadata conventions as keep-alive roots; excluded `AGENTS.md` and `src/components/CheatsheetList.tsx` because they were already dirty; treated the generated catalog as authoritative and did not hand-edit it.

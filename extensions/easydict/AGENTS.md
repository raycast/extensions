# Raycast Easydict Extension Guidelines

Easydict provides dictionary lookup, translation, language detection, TTS, and audio playback on macOS and Windows. Preserve both platforms; guard platform-specific APIs, paths, and shells.

Use `raycast-extension` for Raycast API/UI, manifest, lifecycle, platform, or Store work. Provider parsing and other ordinary TypeScript changes do not require loading it. Skills are tracked in `skills-lock.json`; synchronize published versions with `npx skills experimental_install`.

## Development and Verification

Use `npm run dev` for native development. For code changes, complete the CI checks on the final implementation:

```bash
npm run lint
npm test
npm run build
```

`build` includes Raycast type checking. Use focused tests while iterating; after the final checks pass, repeat them only for subsequent changes or unresolved failures. Use `npm run fix-lint` only when automatic fixes are intended. For documentation-only changes, check formatting, links, and `git diff --check`; report skipped code checks.

Add tests for observable behavior, external contracts, real regressions, or important invariants. For regression fixes, demonstrate failure before the fix and success afterward. Test real parsing, caching, and migration logic; mock the Raycast runtime or network boundary instead of reimplementing business rules in mocks. Test names should state the scenario and expected outcome; avoid duplicate or implementation-only coverage.

## Architecture and Invariants

Use these entry points when working on the corresponding area:

| Area | Entry points and ownership |
| --- | --- |
| Feature UI and state | `src/features/search/` owns lookup UI and hooks; `features/favorites/` owns saved-word UI, models, persistence, and export; `features/provider-management/` owns profile forms and model discovery |
| Provider catalog and ordering | `src/providers/catalog.ts` and `order.ts` own metadata and ordering; `registry.ts` assembles runtime factories; `web.ts` owns lightweight web actions |
| Provider protocols | `src/providers/`: category base classes and registries; detection registry in `detect/registry.ts`; OpenAI-compatible streaming in `translation/ai/openai-compatible.ts` |
| Content and rendering | `src/core/content/types.ts` owns semantic content; `compose.ts` owns visibility and supplements; `view.ts` derives lightweight rows and `render.ts` builds selected, standalone, or saved Markdown; `core/results/` owns query/service contracts and icons |
| Query lifecycle | `src/core/query/QueryRunner.ts` owns query sessions, requests, and single-service content results; `src/features/search/useQueryEngine.ts` subscribes and synchronously projects the UI; `src/core/detect/` orchestrates detection |
| AI configuration | `src/providers/profiles/`: profiles, persistence, legacy migration, runtime configuration, and cache identity |
| Audio and language | `src/core/audio/` handles download, playback, and TTS; `src/core/language/catalog.ts` owns language literals and provider mappings; detectors emit observations and `src/core/detect/` decides language per query |
| Favorites | `src/features/favorites/model.ts` owns saved content; `decode.ts` validates snapshots; `legacy.ts` converts old display snapshots; `repository.ts` serializes fresh-read mutations and recovery |
| Shared utilities | `src/shared/` owns HTTP, errors, logging, and cryptography; provider protocol helpers remain in `src/providers/shared/` |

- Provider base methods own timing, cancellation, and final error normalization through `handleRequestError`. Translation `request()` is an async generator adapted from `doTranslate()`; detection delegates to `doDetect()`, and dictionary lookup to `doQuery()`. Catch in subclasses only for protocol recovery or typed error conversion.
- Keep payload types and protocol decoding provider-specific; providers return semantic `ProviderContent`. Compose visibility and supplements without modifying single-service results or caches. Share provider code in `src/providers/shared/` only when it has multiple consumers.
- Generate Markdown at the selected detail or page boundary; do not put UI identities, cache markers, or aggregate comparison Markdown into content snapshots. Favorites save already-composed content and service metadata, independent of current provider settings.
- Favorites read the previous key only when the new key is absent. The first explicit mutation saves the whole converted collection; a present new key stays authoritative, including an empty collection. Preserve the old key, back up invalid data before explicit recovery, and keep unknown future versions read-only. Legacy display types stay inside the favorites compatibility boundary.
- Keep profile configuration independent of UI hooks; `src/providers/profiles/useAIProviderProfiles.ts` is the explicit shared React entry point for search and management. Keep AI dictionary prompts, parsing, and payload types in `src/providers/dictionary/ai/`; shared translation/dictionary routing uses `providers/profiles/dictionaryCandidate.ts`.
- Keep result contracts independent of provider payloads, profile configuration, and rendering. Preserve their discriminated unions and stored enum values when changing ownership.
- Query changes must preserve latest-request ownership of streaming updates, final results, cache writes, and loading cleanup. Clearing cache must prevent requests started before the clear from repopulating it; favorites remain independent of query cache.
- Static settings and credentials use Raycast Preferences. Dynamic AI profiles, including credentials, use Raycast's encrypted `LocalStorage` through `src/providers/profiles/repository.ts`. Preserve saved profiles and favorites when changing formats or migration behavior.
- Organize actions by purpose and frequency of use. Preserve existing primary/secondary actions, shortcuts, and root navigation behavior unless the task intentionally changes them; the first two actions receive Raycast's default shortcuts. Place new actions in the appropriate group rather than requiring every addition to go at the end.

## Code Conventions

- Use `@/` imports across modules and relative imports within a directory.
- Use `unknown` and narrow it; do not use `any` or `as unknown as`. Prefer inferred types except at public boundaries or where an annotation improves clarity.
- Keep logic near its use; extract for actual reuse, a clear boundary, or substantial readability. Catch errors where recovery or error translation belongs.
- Use generated `Preferences` and `Arguments` from `raycast-env.d.ts`, with `getPreferenceValues<Preferences>()`. Do not add fallbacks for manifest-guaranteed values.
- Use `RequestError` and `CancelledError` for provider errors, `normalizeError` for unknown errors, and `showErrorToast` or `showFailureToast` at the UI boundary.

## Documentation and Releases

- Update `README.md` and the corresponding maintained content in `README_ZH.md` for user-facing features or breaking changes. Keep Features concise; put detailed setup, defaults, and retention behavior under Configuration.
- Keep each Markdown paragraph or list item on one physical line; preserve structural line breaks in code blocks and tables.
- Regenerate `<!-- automd -->` blocks with `npm run docs:gen`; do not edit their contents manually.
- Use conventional commit and PR titles: `type(scope): summary`, with `feat`, `fix`, `docs`, `chore`, `refactor`, or `test`.

When editing the changelog:

- Describe user-observable changes in the final net diff against the actual PR/branch target (normally `origin/main`). Omit internal refactors, tests, documentation, already released changes, and regressions introduced and fixed within the same unreleased branch.
- Fold presets and supporting fixes into their parent feature unless independently user-visible. State migration, deprecation, and fallback conditions precisely, including reversibility where relevant.
- Use `## [vX.Y.Z] - {PR_MERGE_DATE}` for new PR entries; keep the placeholder and do not add an `Unreleased` section.

When explicitly preparing a release, update `CHANGELOG.md`, `EASYDICT_VERSION`, and `RELEASE_MARKDOWN` in `src/consts.ts` together, with matching versions and the merge-date placeholder preserved. Commit and push release changes only when requested.

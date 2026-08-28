# Raycast Easydict Extension Guidelines

## Project Scope

- This is a Raycast extension for dictionary lookup, translation, language detection, TTS, and audio playback.
- It targets both macOS and Windows. Guard platform-specific APIs and avoid assuming POSIX paths or shells.
- Provider payloads differ substantially. Keep provider-specific response types and parsing logic strict.
- Use Raycast Preferences for credentials and Raycast-native APIs for UI, cache, and persistence.
- Apply the `raycast-extension` skill when a task requires Raycast-specific APIs or conventions, including UI, Preferences, command architecture, publishing, or platform compatibility.

Skills are locked in `skills-lock.json` and synchronized with:

```bash
npx skills experimental_install
```

## Development and Verification

```bash
npm run dev
```

For code changes, run the same validation used by CI:

```bash
npm run lint
npm test
npm run build
```

`npm run build` performs Raycast's build and type checking. Use `npm run fix-lint` only when automatic fixes are intended. For documentation-only changes, run relevant checks and report any skipped commands.

Do not manually edit content inside `<!-- automd -->` blocks. Regenerate it with:

```bash
npm run docs:gen
```

## Architecture

### Providers (`src/providers/`)

Translation, detection, and dictionary providers use base classes with template methods:

- Translation exposes `request()` as an async generator. Streaming and non-streaming intermediate base classes adapt `doTranslate()`.
- Detection exposes `detect()` and delegates to `doDetect()`.
- Dictionary lookup exposes `request()` and delegates to `doQuery()`.

Public base methods handle timing, cancellation, and final error normalization through `handleRequestError`. Subclasses may catch errors only for protocol-specific recovery or conversion to typed domain errors.

Provider registries store provider classes and are consumed by the query or detection engines, which instantiate providers when needed. Translation and dictionary registries live in their category `index.ts`; detection uses `src/providers/detect/registry.ts`.

OpenAI-compatible translation providers share `src/providers/translation/openai-compatible/base.ts` for streaming and endpoint/model/key configuration.

- Keep API calls, response types, and parsing provider-specific.
- Follow neighboring provider patterns.
- Put genuinely shared provider code in `src/providers/shared/`; do not introduce abstractions for a single implementation.

### Core and Query Flow

- `src/hooks/useQueryEngine.ts` coordinates detection and provider requests.
- `src/core/detect/` orchestrates language detection and consumes the detection registry.
- `src/core/query/` owns query state, display aggregation, hide rules, and cross-service coupling.
- Dictionary providers create their provider-specific `displaySections`; core query logic aggregates and adjusts them.
- `src/core/audio/` handles download, playback, and TTS.
- `src/core/language/` contains language types, constants, and mappings.

### Raycast UI

- Prefer Raycast components, Preferences, `Cache`, and `LocalStorage` over custom alternatives.
- Match existing loading, empty-state, metadata, action, and shortcut conventions.
- Keep the root command's navigation behavior consistent with neighboring code.
- Verify platform support before using Raycast or Node APIs; guard macOS-only features.

## Code Guidelines

- Keep logic near its usage. Extract helpers only for reuse, a clear boundary, or a substantial readability improvement.
- Avoid premature abstractions and defensive `try/catch`; let errors propagate unless recovery or error translation is required.
- Do not use `any` or `as unknown as`. Use `unknown` and narrow it.
- Prefer inferred types except for exports, public APIs, or clarity.
- Prefer functional array methods when they remain clearer; use type guards to preserve inference after filtering.
- Use `@/` aliases across modules, for example `@/providers/dictionary/youdao/types`. Use relative imports within the same directory.

### Preferences and Errors

- Do not manually define `Preferences` or `Arguments`; use the generated types in `raycast-env.d.ts`.
- Read preferences with `getPreferenceValues<Preferences>()`.
- Do not add optional chaining or fallbacks when the manifest guarantees a value.
- Use `RequestError` and `CancelledError` for typed provider errors.
- Use `normalizeError` for unknown errors and `showErrorToast` or `showFailureToast` for user-facing failures.

## Commits and Releases

Use conventional commit and PR titles: `type(scope): summary`. Valid types are `feat`, `fix`, `docs`, `chore`, `refactor`, and `test`. Keep commits atomic and leave the repository buildable.

When explicitly preparing a release:

1. Update `CHANGELOG.md`, preserving the `{PR_MERGE_DATE}` placeholder.
2. Update `EASYDICT_VERSION` and `RELEASE_MARKDOWN` in `src/consts.ts`.
3. Ensure the version and changelog entry match.
4. Commit and push the release changes only when requested.

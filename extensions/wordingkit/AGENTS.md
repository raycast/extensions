# AGENTS.md

## Project scope

WordingKit is a standalone Raycast extension for rewriting the currently
selected text with OpenAI, Anthropic, Groq, or a local Ollama server. It is a
TypeScript/React application running in the Raycast runtime; it has no backend,
database, or server-side authentication.

This repository is the canonical public source. Do not add files from the
former `raycast-scripts` monorepo.

## Layout and ownership

- `src/index.tsx` owns the primary `Rewrite This` flow: selection, request
  cancellation, result paste, and user-visible errors.
- `src/settings.tsx` and `src/mode-form.tsx` own mode management UI.
- `src/modes.ts` owns versioned Raycast `LocalStorage` data and migrations.
- `src/tones.ts` owns the English and Russian default mode presets; mode IDs
  must remain stable.
- `src/i18n.ts` owns WordingKit runtime UI strings. `src/language.ts` defines
  supported languages and the English fallback.
- `src/providers.ts` and `src/ollama.ts` own provider request/response
  contracts. Keep provider-specific HTTP code there.
- `src/rewrite-state.ts` contains pure view-state logic.
- `test/` contains Node built-in test-runner coverage; `manual-eval/` and
  `scripts/` support repeatable manual rewrite evaluation.
- `package.json` is both the npm manifest and Raycast extension manifest.

## Development and verification

```bash
npm ci
npm run dev

npm test
npm run lint
npm run build
```

Run the relevant tests before changing a behavior, then run all three checks
above before opening a PR. Raycast tooling can require access to user-level
Raycast directories; treat sandbox-only failures as environment failures only
after rerunning with the required access.

For UI, storage, or provider changes, also verify manually in Raycast:

- selected text is read and a successful rewrite is pasted;
- errors and cancellation never paste a result;
- Settings and `Rewrite This` remain usable;
- changed language, reset, or provider behavior works with a real selection.

## Implementation rules

- Preserve the primary-flow guarantees: input is limited to 20,000 characters,
  requests time out after 60 seconds, and cancelled or failed requests do not
  paste text.
- API keys belong only in Raycast Preferences. Never add keys, tokens, or
  `.env` content to source, tests, docs, fixtures, or logs. Provider errors
  must redact any key they may contain.
- Pass the complete selected `EditingMode` through `rewriteText()`; do not
  duplicate provider/model/prompt selection in UI components.
- Storage changes must be versioned and migrate valid existing documents
  without overwriting custom modes, prompts, providers, models, ordering, or
  usage metadata. English is the fallback for new and legacy documents.
- Keep the runtime UI in US English. Changing `presetLanguage` must not mutate
  existing modes; only the confirmed reset action replaces modes with the
  selected English or Russian preset.
- Add all WordingKit-owned runtime UI text to `src/i18n.ts`; do not hard-code
  new user-facing strings in components. Static Raycast manifest metadata is
  intentionally English.
- Preserve all 12 stable preset mode IDs across English and Russian defaults.
  Keep custom modes language-neutral.
- Add or update tests in `test/` for every UI, storage, preset, or provider
  contract change. Do not rely solely on manual Raycast testing.
- Do not edit `package-lock.json` manually. Regenerate it with npm only when a
  dependency change requires it. Do not commit `node_modules`, build output,
  generated reports, or `raycast-env.d.ts`.

## Documentation, git, and release

- Update `README.md` when installation, commands, configuration, privacy, or
  supported-provider behavior changes. Follow `CONTRIBUTING.md`, `SECURITY.md`,
  and `MAINTAINERS.md` for their respective concerns.
- Use Conventional Commits: `<type>(<optional-scope>): <imperative lowercase description>`.
- Keep commits and PRs focused; run `git diff --check` before committing.
- `npm publish` is intentionally blocked. Publishing to the Raycast Store uses
  `npm run publish` and requires explicit maintainer approval after successful
  checks and manual QA.

<!-- docs-source: repository=git@github.com:suregoodru/wordingkit.git; branch=main; commit=077e37e53ceffabbd608aac27f9187f23d0a1c17; tag=; path=AGENTS.md; dirty=true -->

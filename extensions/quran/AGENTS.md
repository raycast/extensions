# AGENTS.md - Raycast Quran Extension

Raycast extension to search Quran ayahs and paste/copy them. Offline-first, Arabic normalization.

## Commands

- `npm run dev` - ray develop (live reload in Raycast)
- `npm run lint` / `npm run fix-lint` - raycast eslint config
- `npm run build` - ray build

No test runner configured. Verify by running the extension via `npm run dev`.

## Structure

- `src/search-ayah.tsx` - the single command
- `src/lib/` - shared logic: `normalize.ts`, `search.ts`, `format.ts`, `types.ts`, `data.ts`
- `src/data/ayahs.json`, `src/data/surahs.json` - bundled QPC Hafs data (QUL/Tarteel)
- Command entry and preferences live in `package.json` (Raycast manifest)

## Invariants (do not break)

1. Offline-first. No network calls. All data bundled as JSON; `resolveJsonModule` is enabled.
2. Manual filtering only: `<List filtering={false}>` and match in code. Raycast's built-in
   filter cannot normalize Arabic, so it must never be re-enabled.
3. Normalization is an exact port of obsidian-quran-helper-plugin (tashkeel/alef-variant
   stripping, QPC marks, Eastern Arabic digit conversion). Precompute `normalized_text` once
   at load; match per keystroke against it.
4. Numeric intercept: `surah:ayah` and plain-number queries are handled before text matching,
   in either numeral system.
5. Output is paste-to-frontmost-app or clipboard only. No file creation, ever.
6. Actions: Enter = paste, Cmd+Enter = copy to clipboard.
7. No translation/tafsir content. Arabic text only.

## Conventions

- TypeScript strict. No `any`, no `@ts-ignore`.
- Prettier: printWidth 120, double quotes. Match it.
- Data model: `Ayah { surah_id, ayah_id, text, surah_name, surah_name_en, page }`

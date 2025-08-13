AGENTS guide for montra-cli (Raycast extension)

- Build: npm run build (ray build)
- Dev: npm run dev (ray develop)
- Lint: npm run lint (ray lint); auto-fix: npm run fix-lint
- Publish to Raycast Store: npm run publish
- Tests: not configured. If/when Vitest is added: run all: npx vitest; single: npx vitest path/to/file.test.ts -t "name"
- TS settings: strict true, isolatedModules true, target ES2023, commonjs, esModuleInterop
- ESLint: extends @raycast/eslint-config; follow Raycast best practices; no unused vars/imports; prefer const; avoid ts-ignore unless justified
- Prettier: printWidth 120; double quotes (singleQuote: false)
- Imports: ES import syntax; order external -> internal/absolute -> relative; no cycles; avoid dynamic require
- Types: prefer explicit types and return types on exports; avoid any; use unknown for unsafe values
- Naming: camelCase vars/functions; PascalCase types/interfaces and React components; UPPER_SNAKE_CASE for shared constants
- Errors: use try/catch; surface issues via Raycast showToast/showHUD with helpful messages; log details with console.error; never silently fail
- Side effects & files: keep commands small; avoid global mutable state; place command entrypoints in src/; colocate small helpers or use utils
- I/O: prefer async APIs; validate inputs; handle null/undefined defensively under strict mode
- Git hygiene: keep diffs small; run lint before commits; include only necessary files
- Security: do not log secrets; validate data from CLI or network
- Automation: no Cursor rules or Copilot instructions found in repo as of this commit
- Testing note: prefer Vitest + tsx; colocate \*.test.ts next to sources; keep tests fast

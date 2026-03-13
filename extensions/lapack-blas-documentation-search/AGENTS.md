# Repository Guidelines

This guide helps contributors ship updates to the LAPACK/BLAS Documentation Search Raycast extension.

## Project Structure & Module Organization

- `src/lapack-blas-docs.ts`: main Raycast command with search UI, caching, and detail rendering.
- `docs/`: markdown documentation files for 2,185+ LAPACK and BLAS routines.
- `scripts/parse_lapack.py`: Python script to generate markdown documentation from LAPACK source code.
- `assets/extension-icon.png`: Raycast marketplace icon; keep additional assets here and reference them in `package.json`.
- Root configs (`package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`) define build, lint, and testing behavior.

## Build, Test, and Development Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run fix-lint
```

- `npm run dev`: launches `ray develop` with live reload.
- `npm run build`: validates and bundles through `ray build`; required before publishing.
- `npm run lint`: runs the Raycast lint pipeline (requires internet for schema checks).
- `npm run fix-lint`: applies safe lint/format fixes.

## Documentation Generation

The markdown documentation files in `docs/` are generated from the official LAPACK source code:

```bash
# Install dependencies (requires Python 3)
pip install -r requirements.txt

# Clone the LAPACK repository and run the parser
cd /tmp
git clone --depth 1 https://github.com/Reference-LAPACK/lapack.git
cd /path/to/this/repo
python3 scripts/parse_lapack.py
```

The script extracts Doxygen-formatted documentation from Fortran source files and generates markdown files for each LAPACK/BLAS routine.

## Coding Style & Naming Conventions

- Strict TypeScript targeting ES2023 with module CommonJS.
- Prettier enforces 2-space indentation, 120-character line limit, and double quotes.
- Commands export PascalCase components; helper modules export camelCase functions.
- Prefer async/await, graceful error handling with Raycast toasts, and concise inline comments only for complex logic.

## Testing Guidelines

- Add test cases when modifying search or parsing logic; ensure tests pass before submitting changes.
- Document manual Raycast checks in PR descriptions (inputs tried, expected markdown) until we have broader test automation.
- Verify the extension works correctly using `npm run dev` and test search functionality with various LAPACK/BLAS routine names.

## Commit & Pull Request Guidelines

- Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.) for clarity.
- Each PR should summarize changes, list verification steps (`npm run build`, `npm run lint`), and attach screenshots or screen recordings for UI tweaks.
- **Always update `CHANGELOG.md` after making any changes** to document user-facing modifications, bug fixes, or improvements.
  - Use semantic versioning (MAJOR.MINOR.PATCH) for version numbers
  - Increment PATCH version (e.g., 1.1.0 → 1.1.1) for bug fixes
  - Increment MINOR version (e.g., 1.1.0 → 1.2.0) for new features
  - Increment MAJOR version (e.g., 1.1.0 → 2.0.0) for breaking changes
  - Add entries with format `## [XX] - {PR_MERGE_DATE}` (do not replace {PR_MERGE_DATE} with actual dates)
  - Do not use `[Unreleased]` - always specify a version number
- Always push your branch immediately after each commit to keep remote history in sync.

## Raycast-Specific Tips

- Ensure `package.json` metadata (`commands`, title, licensing) reflects the implemented command.
- Use `ray login` prior to `npm run publish`, and never commit API tokens or personal Raycast data.
- Confirm icons stay within Raycast size requirements and are referenced via relative paths.
- Test the extension's search functionality with common LAPACK/BLAS routines like `dgemm`, `sgesv`, `zheev`, etc.

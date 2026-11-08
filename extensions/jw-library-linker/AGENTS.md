# Repository Guidelines

## Project Structure & Module Organization

This project is a macOS Raycast extension for opening JW Library references, publications, meetings, and bookmarks.

- `src/jw-library-linker.tsx`: Raycast command, search parsing, local publication and bookmark discovery, SQLite queries, and deep links.
- `src/bible-books.ts`: German Bible book names, identifiers, and aliases.
- `icon.png` and `icons/bookmarks/`: extension and bookmark artwork.
- `package.json`: extension manifest, command preferences, dependencies, and scripts.
- `tsconfig.json`: strict TypeScript configuration; `raycast-env.d.ts` contains generated Raycast declarations.

There is currently no dedicated test directory.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start Raycast development mode.
- `npm run build`: build the extension into `dist/`.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run lint`: invoke Raycast linting.

Development requires Raycast; publication and bookmark checks also require a local JW Library installation and the `sqlite3` executable.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, double quotes, semicolons, and explicit types for structured data. Use camelCase for functions and variables, PascalCase for types and components, and UPPER_SNAKE_CASE for shared constants. Keep source filenames kebab-case and Raycast command filenames aligned with the manifest. Preserve German spellings and aliases when editing Bible metadata. No standalone formatter configuration is present; use the existing style and Raycast lint command.

## Testing Guidelines

No automated test framework, test script, or coverage threshold is configured. Run typecheck, lint, and build before submitting changes. In Raycast, manually verify `1Mo 1:1`, `Römer 8:28`, `1.Chr2:3,4`, `m`, `s keyword`, `b`, and `it_X kingdom`. Check invalid references, missing local data, and container auto-detection when changing discovery or parsing. Record the cases exercised in the PR.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so existing commit conventions cannot be verified. Use short, imperative commit subjects describing one focused change. PRs should explain the behavior changed, include validation results, link relevant issues, and include screenshots for visible UI changes.

## Local Data & Configuration

Use the optional `containerUuid` command preference when auto-detection fails. Keep personal container identifiers and JW Library databases out of commits and fixtures. Preserve read-only access to publication and bookmark data.

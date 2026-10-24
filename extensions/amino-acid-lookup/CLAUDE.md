# Amino Acid Lookup — Raycast extension

- `src/lib/amino-acids.ts` — residue data table (one entry per line, `// prettier-ignore`) + pure lookup logic (`findResidues`, `threeToOne`, `oneToThree`, `peptideMass`). No Raycast imports; keep it that way so it stays testable with plain Node.
- `test/amino-acids.test.ts` — Node built-in test runner, no extra packages. Run `npm test` after changing the lookup logic or data.
- `src/lookup.tsx` — the single `view` command: a `List` with `filtering={false}` (we do our own matching) and `isShowingDetail`. `findSequences` decides which sequence readings to show; `COPY_ORDER` decides what Enter copies. Colours come from `src/lib/color-schemes.ts` (Taylor, Clustal X), chosen by the `colorScheme` extension preference declared in `package.json`.
- `package.json` is also the Raycast manifest (commands, arguments, icon).

Conventions
- Run `npm test` and `npm run lint` (ray lint: eslint + prettier, 120 cols) before finishing a change.
- Avoid keyboard shortcuts that clash with `Keyboard.Shortcut.Common.*` — the linter flags them.
- Scientific data (masses, codons) must be checked against a source before editing.
- `npm run dev` must be run on the Mac with Raycast installed; it can't be tested in a headless environment.

# English Conjugation

## Purpose

This project is a Raycast extension that lets the user type an English infinitive and immediately see the essential conjugated forms with a minimal UI.

## Main Files

| File                     | Responsibility                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| `package.json`           | Raycast manifest, command configuration, scripts, and dependencies |
| `src/conjugate-verb.tsx` | Main Raycast command UI using a `List` with detail pane            |
| `src/conjugation.ts`     | Input parsing and form-building logic                              |
| `src/collocations.ts`    | Curated common-collocation dataset for frequent verbs              |
| `src/eng-verber.d.ts`    | Local type declaration for the conjugation package                 |

## Main Flow

1. Raycast opens the `conjugate-verb` command.
2. The command seeds the search bar from the optional `verb` argument.
3. Every search-bar update is treated as the current infinitive input.
4. `src/conjugation.ts` strips a leading `to`, keeps the first token, and asks the conjugation package for verb forms.
5. The helper also looks up curated common collocations for frequent verbs.
6. The UI renders the five essential forms as list items and shows lightweight usage guidance plus collocations in the detail pane.
7. Each item offers copy actions for the selected form, the collocations when available, or the full set.

## UX Notes

- The list uses custom filtering because the search bar is the verb input itself.
- The right-side detail pane keeps the main list compact and readable.
- Collocations live in the detail pane so the primary list stays minimal.
- Empty state stays explicit so the extension feels guided instead of blank.

## Config

- `npm run dev` starts Raycast development mode.
- `npm run lint` runs Raycast linting.
- `npm run build` validates the production build with `ray build -e dist`.

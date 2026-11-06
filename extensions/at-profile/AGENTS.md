# @ Profile: notes for contributors and coding agents

@ Profile opens a username on a social app (X, Instagram, GitHub, custom apps) and keeps a History of what was
opened. Paths here are relative to the extension root, because this file ships with the extension.

## Commands

```bash
npm run dev      # ray develop
npm run build    # ray build -e dist
npm run lint     # ray lint (ESLint + Prettier)
npx tsc --noEmit # ray build and ray lint don't typecheck; run this too
npm test         # vitest, against stubbed @raycast/api and @raycast/utils
npm run evals    # AI tool evals in ai.yaml
```

## Layout

| Path                                            | What it holds                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/*.tsx`, `src/*.ts`                         | One file per command in `package.json`: `open-profile`, `quick-open`, `manage-apps`, `history`, `import-apps`, `export-apps` |
| `src/tools/`                                    | AI tools `open` and `history`. Their instructions and evals are in `ai.yaml`                                                 |
| `src/helpers/storage.ts`                        | The only module that reads or writes `LocalStorage` for extension data                                                       |
| `src/helpers/file-lock.ts`                      | Cross-process lock used by `withStorageLock`                                                                                 |
| `src/helpers/apps.ts`, `src/helpers/history.ts` | App list and History logic. Every write goes through `withStorageLock`                                                       |
| `src/helpers/url.ts`                            | Builds profile URLs, validates URL templates, and generates custom app IDs                                                   |
| `src/yaml-settings.ts`                          | YAML export and import                                                                                                       |
| `src/hooks/`                                    | `useApps` and `useHistory`, shared by every view and reloaded after writes                                                   |
| `src/utils/default-apps.ts`                     | The built-in apps                                                                                                            |
| `test/`                                         | Vitest suites; `test/stubs/` stands in for the Raycast packages                                                              |

## Rules that aren't obvious from the code

- **Storage goes through `src/helpers/storage.ts`.** `test/storage.test.ts` fails if another module touches
  `LocalStorage` directly. Reads validate every row and skip bad ones, so a damaged value can't break a command.
- **Every read-modify-write runs inside `withStorageLock`.** Raycast runs each command and each AI tool call in its
  own process, and without the lock two of them can drop each other's change. Read, decide and write all inside the
  callback. A data write outside the lock throws. Nested locked calls are fine: the lock is reentrant within one
  call chain. The only unlocked writes are plain overwrites of view state: the remembered app, History's filter and
  its search text.
- **App IDs never change after an app is created.** History, favorites and visibility are keyed by the ID, so
  editing a custom app's URL keeps them. Schema migrations (`SCHEMA_VERSION` in `src/helpers/storage.ts`) rename old
  IDs and record each rename in `appIdAliases`; views that remember an old ID look it up with `getMigratedAppId`.
- **History keeps 100 profiles** (`MAX_HISTORY_ITEMS`), one entry per profile and app, matched without regard to
  case or a leading @. Each entry counts its opens.
- **"Favorites" in the UI, `starred` in code and storage.** The UI says Add to Favorites so it can't be read as
  starring the profile on the app itself. The AI tool keeps its `star`, `unstar` and `list_starred` actions.
- **Development mode runs each effect's cleanup once right after mount.** A ref that tracks whether a view is mounted
  must be set to true inside the effect, not only in `useRef`, or it stays false (see `src/import-apps.tsx`).
- **Export** writes to the Export Directory preference (Downloads by default) and never replaces an existing file.
  Its toast carries Show in Finder and Copy Path. `export-apps` is a no-view command that uses a toast, not a HUD,
  because a HUD closes Raycast and drops the toast's actions.
- **Toasts use `@chrismessina/raycast-kit`** (`showError`, `failToast`), so every failure toast has Copy Error.
- **The Quick Open dropdown in `package.json` must list the built-in apps.** `test/manifest.test.ts` checks it.

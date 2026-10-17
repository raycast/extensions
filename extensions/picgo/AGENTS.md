# Agent Guide — raycast-extension-picgo

This is a [Raycast](https://raycast.com) extension wrapping [PicGo-Core](https://github.com/PicGo/PicGo-Core) for image uploading. Built with React (`@raycast/api`) using CommonJS modules and ES2023 target.

## Commands

| Command                      | File                                        |
| ---------------------------- | ------------------------------------------- |
| `npm run build`              | `ray build`                                 |
| `npm run dev`                | `ray develop`                               |
| `npm run dev:beta`           | `RAY_Target=x ray develop`                  |
| `npm run lint`               | `ray lint`                                  |
| `npm run fix-lint`           | `ray lint --fix`                            |
| `npm run pull-contributions` | pull upstream contributions with latest CLI |
| `npm run publish`            | publish to Raycast Store                    |

Use `npm run dev:beta` when developing against Raycast Beta/v2. The explicit `RAY_Target=x` target writes the
compiled command entrypoints to `~/.config/raycast-x/extensions/picgo`; without it, an older Raycast CLI may write
them to the v1 directory and Raycast Beta will report `Missing executable`.

No test framework or CI is configured. `prepublishOnly` is a guard (not for npm publish).

## Subsequent release workflow

1. Finish the feature or bugfix and verify it with `npm run lint` and `npm run build`.
2. Before pulling contributions, prepend the new release entry to `CHANGELOG.md`. Keep the merge-date placeholder:

    ```markdown
    ## [Short Release Title] - {PR_MERGE_DATE}

    - Describe the user-visible change.
    ```

3. If another contributor changed the extension, or changes were made directly on GitHub, run
   `npm run pull-contributions` and resolve the resulting conflicts locally.
4. Re-run the build and lint checks after resolving conflicts.
5. Run `npm run publish`. The latest Raycast CLI performs its own build and lint checks, updates the extension fork,
   and opens a pull request from the fork to `raycast/extensions`. The release reaches the Raycast Store after that PR
   is reviewed and merged.

**Important:** `pull-contributions` determines which contributions to fetch from the newest version declared in the
local `CHANGELOG.md`. Never run it before adding the new `{PR_MERGE_DATE}` entry; otherwise it can pull contribution
code from the previous release and introduce confusing stale-code conflicts. After the previous release is merged,
Raycast replaces its placeholder with the actual merge date, so a `CHANGELOG.md` conflict during the next pull is
normal—preserve both the filled previous date and the new release entry.

Do not use `npm publish`; `prepublishOnly` intentionally blocks it. Store releases must use `npm run publish`.

## Project structure

- **`package.json`** is the Raycast extension manifest (commands, preferences). It is NOT a typical npm package — do not treat `name`/`main` as entrypoints.
- **`src/*.tsx`** — top-level files are Raycast command entrypoints, each corresponding to a `commands[]` entry in `package.json`.
- **`src/components/`** — shared UI components.
- **`src/util/`** — core logic: PicGo context singleton (`context.ts`), URL format helpers (`format.ts`), file/image utilities (`util.ts`), NPM registry constant (`npm.ts`).
- **`src/types/`** — TypeScript type declarations (including module augmentation for `picgo`).
- **`assets/`** — extension icon.
- **`media/`** — screenshots for README.

## Key patterns

- **PicGo context singleton**: `getPicGoContext()` in `src/util/context.ts` lazily creates a single `PicGo` instance. All commands import and call this function. It proxies env, preferences (npmPath, npmMirror, npmProxy, proxy, uploadTimeout) to PicGo.
- **Config management**: Uploader configs are managed via `ctx.uploaderConfig.*` (not `picgo.saveConfig` directly). Config dropdown items serialize `UserUploaderConfig` as JSON strings.
- **Selected config is remembered in Raycast LocalStorage** (key `picgo:user_uploader_config`) — NOT written to PicGo's config file.
- **Export formats** defined in `src/util/format.ts`: URL, Markdown, HTML, UBB, and Custom (via `$url`/`$fileName`/`$extName` tokens).
- **Plugin search** auto-prepends `picgo-plugin-` prefix to search terms, and filters out results mentioning `picgo.net` or `PicGo官方`.
- **No npm test/typecheck scripts**. `tsconfig.json` has `strict: true` but only `ray lint` is runnable for verification.

## Linting & formatting

- ESLint: `@raycast/eslint-config` with `no-explicit-any`, `no-unused-vars`, `no-require-imports` disabled.
- Prettier: 120 print width, double quotes, 4-space tabs (matches `.editorconfig`).
- No pre-commit hooks or CI.

## Preferences (defined in package.json)

| Key                   | Type      | Default       |
| --------------------- | --------- | ------------- |
| `uploadTimeout`       | textfield | `30000`       |
| `uploadResultView`    | dropdown  | `format_list` |
| `autoCopyAfterUpload` | checkbox  | `true`        |
| `customFormat`        | textfield | `$url`        |
| `proxy`               | textfield | (empty)       |
| `npmPath`             | textfield | (empty)       |
| `npmProxy`            | textfield | (empty)       |
| `npmMirror`           | textfield | (empty)       |

`npmPath` is prepended to `PATH` for PicGo plugin operations. Do NOT include `npm` in the path.

## Conventions

- **Indentation**: 4 spaces (tabs = 4 spaces in Prettier, `indent_size = 4` in EditorConfig).
- **Quotes**: double quotes (Prettier `singleQuote: false`).
- **No semicolons**: Prettier defaults (no `semi: false` is set, so semicolons are _not_ standard — Prettier default adds semicolons).

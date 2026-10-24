# Architecture

The Memos extension is a Raycast client talking to one Memos instance over its
REST API (`/api/v1`). Each command is a single file at the top of `src/`, and
everything that command needs — views, data hooks, HTTP calls, framework-light
utilities — sits in four folders underneath it. This file explains what
belongs in each and what each is allowed to import.

## Why this layout

Command-per-file with four support folders is the convention used by the
most-used extensions in `raycast/extensions` (Linear, GitHub, Jira, Todoist).
Raycast itself requires one entry file per manifest command at
`src/<name>.tsx`, so contributors who have worked on those extensions will
recognize this shape immediately.

Two alternatives were considered and rejected:

- **Feature folders** (`src/features/setup/`, `src/features/search/`, …) —
  the standard shape for an app with many independent surfaces. Too heavy
  for an extension with a handful of commands; it would scatter three files
  per command across three-deep directories for no benefit yet.
- **Primer-style layers** (`routes/ → controllers/ → services/ →
repositories/`) — right for an HTTP API with a request/response lifecycle
  and a database. This extension has neither; there's no router to mount and
  no persistence layer to own, so those layers would be empty ceremony.

**Revisit this decision once there are more than about 10 commands.** At that
point the flat folders start mixing unrelated concerns and it's worth moving
to `features/`.

## Layer map

| Directory           | Holds                                                                                                         | Rule                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/<command>.tsx` | The manifest entry point, e.g. `src/setup.tsx`                                                                | Composes exactly one hook and one component. No fetching, no markup logic beyond wiring props. Default export.                                                          |
| `src/components/`   | Views (`SetupGuide.tsx`, `SearchMemosList.tsx`, …), action panels, and pure state mappers (`setupStatus.ts`, `memoTitle.ts`) | Render and wire actions. Receive state and callbacks as props; no fetching.                                                                                             |
| `src/hooks/`        | `@raycast/utils` async hooks (`useConnectionCheck.ts`, `useMemos.ts`, …)                                                      | Wrap `usePromise` / `useFetch` / `useCachedPromise`. Turn thrown errors into `errorMessage` strings via `toErrorMessage`; this is the bridge between `api/` and the UI. |
| `src/api/`          | `memosFetch`, `ApiError`/`describeHttpFailure`, one file per Memos service (`auth.ts`, `memo.ts`)                             | The only place that calls `fetch`. Every response is parsed with a Zod schema in the same file, which also exports the inferred `z.infer` type.                         |
| `src/helpers/`      | Framework-light utilities: `instanceUrl.ts`, `errors.ts`, `preferences.ts`                                    | `preferences.ts` is the only file that calls `getPreferenceValues`. Nothing here depends on `@raycast/api` beyond that one exception.                                   |
| `src/tools/`        | Reserved for Raycast AI tools                                                                                 | Not created yet (later).                                                                                                                                                |

## Dependency direction

```
command → components → hooks → api → helpers
```

Imports flow left to right only. A component never imports a hook's caller
(the command file), a hook never imports a component, and nothing in `api/`
or `helpers/` imports from a layer to its left. `helpers/` is a leaf: it may
be imported from anywhere but imports nothing from `components/`, `hooks/` or
`api/`.

## Settings model

The extension has three extension-level preferences, declared once in the
manifest `preferences` array:

- **`instanceUrl`** — textfield, not required, defaults to
  `https://demo.usememos.com`.
- **`accessToken`** — password, required, no default.
- **`defaultVisibility`** — dropdown (`PRIVATE` / `PROTECTED` / `PUBLIC`),
  defaults to `PRIVATE`. Used by Create Memo, Capture Memo and Save Clipboard as Memo.

Raycast can read preferences but can't write them, so there is no in-command
setup form that saves values — the extension never persists its own copy of
either setting. Because `accessToken` is required, Raycast shows its built-in
required-preference form the first time the command runs, before any
extension code executes. The Setup command's job is narrower: check that the
values Raycast already collected actually work, and link back to
`openExtensionPreferences` when they don't.

Two helpers turn raw preference strings into a usable connection:

- `normalizeInstanceUrl` (`src/helpers/instanceUrl.ts`) fills in the `https://`
  scheme when one is missing, trims trailing slashes, and falls back to
  `DEFAULT_INSTANCE_URL` (the demo instance) when the field is blank.
- `getMemosConnection` (`src/helpers/preferences.ts`) reads the preferences and
  returns a `MemosConnection` (`{ instanceUrl, accessToken }`) with the token
  trimmed and the URL normalized.

## Lifecycle of Setup Memos

1. Raycast checks the required `accessToken` preference before the command
   runs, prompting for it if it's missing.
2. `src/setup.tsx` runs `useConnectionCheck` (`src/hooks/useConnectionCheck.ts`).
3. The hook calls `getMemosConnection` (`src/helpers/preferences.ts`), which
   normalizes `instanceUrl` and trims `accessToken`.
4. The hook calls `getCurrentUser` (`src/api/auth.ts`), which calls
   `memosFetch` (`src/api/client.ts`) for `GET /api/v1/auth/me` with an
   `Authorization: Bearer <token>` header.
5. `memosFetch` parses the JSON body against a Zod schema for `{ user }`, and
   returns the inner `user` object typed as `CurrentUser`.
6. `SetupGuide` (`src/components/SetupGuide.tsx`) renders a native `List`
   checklist. `describeSetup` (`src/components/setupStatus.ts`) maps the
   connection state into row titles, tones and tags. The Status section has
   the Connection row; Settings has Instance URL and Access Token. Each row
   carries its own actions (retry, copy error, open preferences, get token,
   open Memos).

The failure paths all end up in the same `errorMessage` slot, described in
human terms by `describeHttpFailure` or the `memosFetch` transport catch:

- **Unreachable instance** — `fetch` throws (DNS failure, no network, refused
  connection); `memosFetch` reports it can't reach the instance.
- **401 / 403** — the access token was rejected; the message links to
  `<instanceUrl>/setting#access-token` to create a new one.
- **404** — the URL doesn't look like a Memos instance.
- **Server message** — the response body parsed as `{ message: string }`;
  that message is shown verbatim, prefixed with the instance.
- **Unrecognized shape** — the response didn't match the expected Zod schema
  at all (wrong instance type, incompatible Memos version).

## Errors

`describeHttpFailure` (`src/api/apiError.ts`) turns an HTTP response into one
of these human-readable cases, in this order:

1. `401` or `403` → "rejected the access token", with the token settings link.
2. A body that parses as `{ message: string }` → that message, prefixed with
   the instance URL.
3. `404` → "doesn't look like a Memos instance".
4. Anything else → "answered with HTTP `<status>` and no explanation".

Every case names the instance URL, never just the status code.

`toErrorMessage` (`src/helpers/errors.ts`) is the last stop before an error
reaches the UI: hooks call it on whatever `usePromise` caught (an `ApiError`,
a thrown `Error` from `normalizeInstanceUrl`, or anything else) and turn it
into a string a `Detail`, `EmptyView` or `showFailureToast` can display. It
never invents a transport string like `"Failed to fetch"` — if the thrown
value has no message, it falls back to one explicit sentence telling the user
to retry and file an issue, rather than leaking implementation detail.

## Commands

| Command | Mode | Entry |
| --- | --- | --- |
| Setup Memos | view | `src/setup.tsx` |
| Search Memos | view | `src/search-memos.tsx` |
| Create Memo | view | `src/create-memo.tsx` |
| Capture Memo | no-view | `src/capture-memo.tsx` |
| Save Clipboard as Memo | no-view | `src/save-clipboard.tsx` |
| Open Memos | no-view | `src/open-memos.tsx` |

## No-view commands

No-view commands are the sanctioned exception to "a command composes a hook
and a component". They may call `api/` directly and report through `showHUD`
/ `showFailureToast`, because there is no view to compose.

## Adding a command

Worked example: adding a `search-memos` command that lists memos.

1. Add a `commands` entry to the manifest (`package.json`): `name:
"search-memos"`, a title, a description, `mode: "view"`.
2. Add `src/api/memo.ts`: a Zod schema for a memo, a response schema, and
   `listMemos(connection: MemosConnection, …): Promise<Memo[]>` calling
   `memosFetch` for `GET /api/v1/memos`.
3. Add `src/hooks/useMemos.ts`: wraps `listMemos` in `usePromise` (or
   `useCachedPromise`), turning errors into `errorMessage` the same way
   `useConnectionCheck` does.
4. Add `src/components/MemoListItem.tsx`: renders one memo as a `List.Item`
   with its `ActionPanel`.
5. Add `src/search-memos.tsx`: composes `useMemos` and a `List` of
   `MemoListItem`s. Default export.
6. Add unit tests for the new schema (`tests/unit/memo.test.ts`) and any pure
   helpers the command introduces.
7. Add a line to `CHANGELOG.md` describing the new command.
8. Verify: `pnpm lint && pnpm build && pnpm typecheck && pnpm test`, then
   `pnpm dev` to check the command by hand.

## Testing

Unit tests live in `tests/unit/` and cover pure modules only: Zod schemas and
the functions in `src/api/` (with `vi.stubGlobal("fetch")`), `src/helpers/`,
and pure mappers like `setupStatus.ts` and `memoTitle.ts`. `@raycast/api` only
exists inside the Raycast runtime, so anything that imports it — commands,
components, hooks — can't be unit-tested and isn't; those are checked by hand
with `pnpm dev` instead.

The manual checklist for Setup Memos: run `pnpm dev`. Raycast should ask for
the access token first, with the instance URL already filled in as the demo.
Then check four cases:

1. A valid demo token shows ✓ "Connected as …" with Demo and Accepted tags.
2. A wrong token shows ✗ "Couldn't connect", the Rejected tag, a failure
   toast, and ⌘T opens `/setting#access-token`.
3. An instance URL of `not a url` shows the "is not a valid instance URL"
   message on the Connection row.
4. `https://example.com` shows either the "doesn't look like a Memos
   instance" message or the "doesn't recognize" message.

"Open Extension Preferences" should open the Memos settings pane in every
case.

## Supporting files

| Path                       | Purpose                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `assets/usememos.png`      | The extension icon referenced by the manifest `icon` field.                              |
| `metadata/`                | Store screenshots: three to six 2000x1250 PNGs, checked by `pnpm store-check`.           |
| `media/`                   | Images linked from `README.md`. Never `assets/`, which is bundled into the extension.    |
| `tools/store-check/`       | The store compliance CLI. Not shipped: excluded from `src/`, run through `tsx`.          |
| `tools/npm-lockfile/`      | Regenerates `package-lock.json` for the store PR, outside pnpm's `node_modules`.         |
| `.github/workflows/ci.yml` | CI: runs lint, build, typecheck, test and store-check on pushes to `main` and on PRs.    |
| `CHANGELOG.md`             | Release notes in the Raycast Store format.                                               |
| `raycast-env.d.ts`         | Generated by `pnpm build` / `pnpm dev` from the manifest; gitignored, never hand-edited. |
| `.agents/`                 | Style and workflow rules AGENTS.md links to.                                             |
| `docs/`                    | This file and `philosophy.md`.                                                           |

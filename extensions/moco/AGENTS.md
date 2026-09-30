# MOCO Raycast Extension – Agent Guide

Raycast extension for the [MOCO](https://www.mocoapp.com) time tracking API: book time, start and stop
timers, and a menu bar with today's timer, favorites and projects. TypeScript + React, part of the
`raycast/extensions` monorepo (`extensions/moco`).

## Commands

```bash
npm install          # dependencies
npm run dev          # ray develop: build, load into Raycast, rebuild on save
npm run lint         # ray lint (ESLint + package.json/asset checks), Raycast CI runs it
npx tsc --noEmit     # type check
npx prettier --write <files>
```

- There are no automated tests. Check changes with `tsc`, `ray lint` and a manual test under `npm run dev`.
- `ray develop` does not pick up removed or renamed commands in `package.json`. Restart it after such a change.

## Versions

- `@raycast/api` 1.43.2, `@raycast/utils` **pinned to 1.5.2**: the newest utils version for this API.
  - `^` would allow utils versions that need a newer API.
  - Not available in 1.5.2: `useLocalStorage`, `showFailureToast`, `Icon.EllipsisVertical`.
- The upgrade to API/utils 2.x (React 19 types, TypeScript 5, ESLint 9 flat config, Node 22 per root
  `.nvmrc`) is open. `tsc` and `ray build` passed on 2.x in a test without code changes.

## Structure

| Command (`package.json`)    | Entry                    | Purpose                                                                                                    |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `moco`                      | `src/moco.tsx`           | project list → tasks → start/log activity                                                                  |
| `moco_today`                | `src/moco_today.tsx`     | today's activities                                                                                         |
| `moco_menu_bar`             | `src/moco_menu_bar.tsx`  | menu bar, `interval: 30s`, refreshes the cache                                                             |
| `start_timer`, `edit_timer` | `src/<name>.tsx`         | tools for direct access (search, hotkeys), also opened from the menu bar                                   |
| `menu_bar_tools`            | `src/menu_bar_tools.tsx` | menu-bar-only windows via `launchContext.view` (actions, favorites, settings), only a hint without context |

- `src/commands/<domain>/`: `api.ts` (MOCO requests + zod schema), `types.ts`, `components/`.
- `src/utils/api.ts`: the shared axios client (base URL, auth header). Always use it, never set headers per request.
- `src/utils/storage.ts`: all `LocalStorage` access.
- `src/utils/refresh.ts`: `refreshCache()` (background runs of the menu bar), `refreshTodaysActivities()`, and `finishMenuBarForm()` for windows opened from the
  menu bar (refresh cache → re-render the menu bar → close the window).
- `src/utils/useStatuses.ts`: favorite/hidden statuses with optimistic updates.
- `src/commands/menu-bar/`: components of the menu bar windows. `tools.ts` has the typed `MenuBarToolsContext`
  and `openMenuBarTool()`. **A new menu bar window = a new `view` + component, not a new command.**

## Data flow

```
moco_menu_bar, background run (30s) → refreshCache() → MOCO API → LocalStorage cache (user, todays_activities, projects)
moco_menu_bar, click → reads the cache (fast, no API wait) → after a timer action: refreshTodaysActivities()
views (lists, forms) → useCachedPromise → API, cached between runs
```

- Always fetch activities with the current user's ID. Without `user_id`, MOCO returns the activities of all users.
- MOCO dates are local calendar dates: use `localDate()` / `parseLocalDate()` from `commands/activities/utils.ts`,
  never `toISOString().split("T")[0]` (UTC date: east of UTC the previous day shortly after midnight).
- `/projects/assigned` already contains each project's tasks. No extra request per project.

## LocalStorage keys

| Key                                       | Value                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `status:project:<id>`, `status:task:<id>` | `"favorite"` or `"hidden"` (one status per item)                         |
| `menu-bar:customer-layouts`               | `{ [customerId]: "submenu" \| "hidden" }`, default inline, `0` = "Other" |
| `menu-bar:favorite-order`                 | task IDs in menu order, favorites without a position go last             |
| `user`, `todays_activities`, `projects`   | cache written by the menu bar's background runs                          |
| `cleanup:legacy-status-keys`              | flag: old `<projectId>` keys (≤ v1.1.4) removed once                     |

## Raycast limits (tested)

- A click (left or right) on a `MenuBarExtra.Item` always closes the menu. No API keeps it open or redraws an open menu.
- A command cannot `launchCommand` itself ("Command cannot launch itself").
- While the menu is open, Raycast skips interval runs of the menu bar.
- Every re-render rebuilds the whole native menu → no timers that re-render while the menu is open (flicker).
- Set all menu bar state in one step and keep `isLoading` until then, else partial menus flicker.
- A `Submenu` has no `onAction`, `tooltip` or `subtitle`. Items without `onAction` show greyed out.
- "Context menus": right-click (`event.type === "right-click"`) → `openMenuBarTool({ view: "task-actions", … })`.
- In a `List`, the first action is ↵, the second ⌘↵. ⌘↑/⌘↓ do not reach extension actions, ⌘⇧↑/⌘⇧↓ and ⇧⌥↑/⇧⌥↓ do.
- In a `Form`, the first action is ⌘↵.
- After a write with a known result, use `mutate(..., { shouldRevalidateAfter: false })`. A reload only makes lists blink.

## Conventions

- Match the surrounding code: 2 spaces, 120 columns, double quotes (`.prettierrc`), comments sparse and about _why_.
- Debug output only behind `environment.isDevelopment`. Never log the API key.
- Commit messages: `<type>(moco): <Subject>`, imperative, e.g. `feat(moco): Add …`, `fix(moco): …`.
- `CHANGELOG.md`: new entry at the top, `## [<title>] - {PR_MERGE_DATE}` (keep the placeholder, CI replaces
  it on merge), past-tense bullets with `by @<github-user>`.
- PRs go from a fork branch to `raycast/extensions:main`. Raycast squash-merges them.

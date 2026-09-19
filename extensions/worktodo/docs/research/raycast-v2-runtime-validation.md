# Raycast v2 Runtime Validation

**Status:** Raycast scaffold and host runtime validated

**Checked:** 2026-08-24

This note records local evidence used to choose the initial repository shape. It does not validate product behavior.

**Package-manager update (2026-09-06):** The repository uses npm 11.16.0, commits `package-lock.json`, and remains a single root package without workspace packages. This supersedes the pnpm contract used between 2026-08-30 and the public Store readiness migration.

**Menu-bar feedback update (2026-09-01):** Raycast 2.1.2 retains the background launch type on action callbacks registered by a background-rendered menu. Its installed backend rejects `showToast` for those callbacks with `Toast API is not available when command is launched in background`. An initial workaround relaunched the active menu command as user-initiated so it could show a Toast. That self-relaunch unloaded the worker while the original menu callback was still executing, producing `Worker unloaded` and replacing the menu item with an error icon even though the task mutation had committed six milliseconds earlier. Worktodo now executes Complete and Hide in the active callback, uses HUD feedback for background launches, and reserves Toast feedback for user-initiated launches.

**CI package-manager update (2026-09-04, superseded 2026-09-06):** The API 2.0.5 `ray lint` implementation validated only npm's `package-lock.json` when `CI=true` and explicitly rejected `pnpm-lock.yaml`. Worktodo temporarily set `CI=false` only for that subprocess. The public Store migration later adopted npm and restored CI-mode Raycast lint.

## Confirmed locally

- Installed Raycast host: `2.1.2.0`, bundle ID `com.raycast.macos`.
- Current npm package: `@raycast/api 2.0.5`, requiring Node `>=22.22.2` and React 19.
- Raycast's bundled Create Extension template still declares:
  - `@raycast/api ^1.104.20`
  - `@raycast/utils ^2.2.7`
  - TypeScript `^6.0.3`
  - npm scripts using `ray develop`, `ray build`, and `ray lint`
- The official template maps every manifest command name to a flat `src/<command>.ts(x)` entry point.
- A temporary copy of that template upgraded to exact `@raycast/api 2.0.5` and `@raycast/utils 2.3.0` installed and completed `ray build` successfully.
- The build compiled view, no-view, menu-bar, and tool entry points and generated Raycast TypeScript definitions.
- The validation shell used Node `24.18.0`, npm `11.16.0`, and SQLite `3.53.1`.
- The API 2.0.5 development extension ran successfully in Raycast v2.0.5.
- Raycast's managed extension runtime reported Node `22.22.2` and SQLite `3.51.2`.
- The My Tasks diagnostic view rendered its native empty state.
- Raycast accepted the menu-bar command and reported that the Worktodo item was added to the macOS menu bar.
- The initial clean npm install had no unreviewed lifecycle scripts, and npm audit reported no known vulnerabilities.

## Implications

- Use one package at the repository root so the project remains shaped like a Raycast Store extension.
- Keep Raycast command entry points flat under `src/`; move reusable UI, domain, and storage code into nested folders.
- Keep the MCP executable outside the Raycast entry-point namespace while sharing domain and storage modules.
- Use npm 11.16.0 and commit `package-lock.json`; do not introduce workspace packages or another package manager without a demonstrated need.
- API 2.2.0 is the Store-compatible baseline adopted for public release readiness.
- Local MCP development can use the pinned Node 24.18.0 toolchain, but shared storage must remain compatible with Raycast's managed Node 22.22.2 runtime.
- SQLite 3.51.2 predates the 3.51.3 WAL race fix identified in the foundation research. Do not enable WAL unless a later Raycast runtime reports a fixed SQLite version and the two-process stress test passes.

## Still unverified

- Store treatment of a sibling MCP entry point and its dependencies.

**Storage resolution (2026-09-06):** Production uses `~/Library/Application Support/Worktodo/worktodo.sqlite` with SQLite DELETE journal mode, synchronous FULL, enabled foreign keys, and a 2,000 ms busy timeout. See the [SQLite runtime validation](sqlite-runtime-validation.md) and current [task model](task-model.md).

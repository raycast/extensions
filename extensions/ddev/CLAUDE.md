# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension (`@raycast/api`) for interacting with [DDEV](https://ddev.com) projects on the user's machine — listing them and running start/stop/snapshot actions. Author has built it primarily against Drupal workflows but wants the core features to remain framework-agnostic.

The `show-projects` command (`src/show-projects.tsx`) is the single Raycast entry point; all DDEV/Drush interaction lives behind a small `src/lib/` layer that shells out to the `ddev` CLI via `node:child_process`.

## Commands

```bash
npm run dev        # ray develop — live-reloads the extension into Raycast
npm run build      # ray build — production build
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
npm run publish    # publishes to the Raycast Store (not npm — see prepublishOnly guard)
```

There is no test runner configured.

## Architecture notes specific to Raycast

- **Commands are declared in `package.json` under `commands[]`, not by file convention alone.** Each command entry's `name` must match a file `src/<name>.tsx` whose default export is the React component Raycast renders. Adding a new command means editing `package.json` AND creating the matching file.
- **`raycast-env.d.ts` is auto-generated** from `package.json` (preferences, arguments, command names). Don't hand-edit it — change `package.json` and let `ray build`/`ray develop` regenerate it.
- The single command today is `show-projects` (view mode). When adding actions that mutate DDEV state (start/stop/snapshot), prefer `@raycast/api`'s `showToast` + `confirmAlert` patterns over silent shell-outs, and surface `stderr` from the `ddev` CLI to the user.

## Best Practices for This Project

**Where code goes (`src/lib/`)**

Keep React/Raycast UI in `src/*.tsx` thin; put all CLI interaction in `src/lib/`. When adding new shell-outs, follow these conventions:

- **New `ddev` commands go in `src/lib/ddev.ts`.** Don't call `ddev` directly from a `.tsx` component or scatter `execFile` calls around — add an exported function here. Wrap mutating commands in the existing `runDdev(args, toastTitles, cwd?)` helper so they get the animated → success/failure toast lifecycle and `stderr` surfacing for free. Read-only commands that produce JSON should add a `parse*` helper alongside `parseProjectList` / `parseDescribe` / `parseSnapshotList`.
- **New `drush` (or other in-container) commands go in `src/lib/drush.ts`.** These are framework-specific (Drupal) helpers that run a shell pipeline inside the project via `runShell(command, cwd, toastTitles)` (re-exported from `ddev.ts`). Keep framework-specific logic out of `ddev.ts` to preserve the "core stays framework-agnostic" goal; if a Drupal-only concept leaks into `ddev.ts`, it probably belongs in `drush.ts` instead. Future framework integrations (e.g. WP-CLI) should get their own `src/lib/<tool>.ts` file mirroring this pattern.
- **Shared types go in `src/lib/types.ts`** — the shapes of `ddev ... --json-output` payloads (`DdevProject`, `DdevDescribeRaw`, `DdevSnapshot`). DDEV wraps JSON output in a `{ raw: ... }` envelope; the `parse*` helpers unwrap `.raw` and tolerate `null`. Extend these types rather than inlining ad-hoc object shapes.
- **Markdown/presentation helpers go in their own lib file** (see `src/lib/describe-markdown.ts`, which turns a `DdevDescribeRaw` into the Raycast detail view). Keep string-building out of components.

**Gotchas**

- **`PATH` is overridden, not inherited.** Raycast launches with a minimal environment, so `ddev.ts` hard-codes `PATH_OVERRIDE` (`/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`) on every `exec`/`execFile`. New shell-outs must pass `env: { ...process.env, PATH: PATH_OVERRIDE }` (or go through `runDdev`/`runShell`, which do this) or the `ddev` binary won't be found.
- **`cwd` matters for project-scoped commands.** Commands like `snapshot`, `launch`, `config`, and bare `start`/`restart` operate on the project rooted at `cwd` (pass the project's `approot`). Commands that take an explicit project name (`start <name>`, `stop <name>`, `import-db <name>`) don't need `cwd`.
- **`renameProject` is a multi-step macro**, not a single CLI command (snapshot → stop --unlist → config --project-name → start → snapshot restore → cleanup). If you touch it, preserve the ordering and the temporary-snapshot cleanup so a failure can't silently drop the database.

## Documentation

You can find documentation for Raycast's API at: https://developers.raycast.com/api-reference/command
You can find documentation for all the DDEV commands available at: https://docs.ddev.com/en/stable/users/usage/commands
You can find documentation for DDEV project management at: https://docs.ddev.com/en/stable/users/usage/managing-projects
# Workflow

## Workspace

- **Work in the existing checkout, on the current branch.** Never create git
  worktrees (`git worktree add`, `.worktrees/`, agent isolation modes).
- **Don't create branches, push or open PRs** unless asked.

## Commands

| Task                         | Command                                            |
| ---------------------------- | -------------------------------------------------- |
| Develop                      | `pnpm dev`                                         |
| Lint (fix)                   | `pnpm fix-lint`                                    |
| Lint                         | `pnpm lint`                                        |
| Build                        | `pnpm build` (also regenerates `raycast-env.d.ts`) |
| Type check                   | `pnpm typecheck`                                   |
| Tests                        | `pnpm test`                                        |
| Store compliance             | `pnpm store-check`                                 |
| npm lockfile (submission)    | `pnpm lockfile`                                    |
| Publish to the Raycast Store | `pnpm run publish` (never `npm publish`)           |

**Done means** `pnpm lint && pnpm build && pnpm typecheck && pnpm test` passes,
plus `pnpm store-check` when the change touched `package.json`, `assets/`,
`metadata/`, `CHANGELOG.md` or `README.md`. If a step fails, report the
output. Don't claim success.

## Dependencies

- **pnpm only for development.** Never npm or yarn for installing, upgrading
  or removing packages, and never commit `yarn.lock`.
- **One exception, `package-lock.json`.** Raycast's CI builds with npm, so the
  store submission PR must carry one. It is committed, so regenerate it with
  `pnpm lockfile` whenever `package.json` dependencies change, and never let it
  drift — `pnpm store-check --submission` checks that it matches.

  **Never run `npm install --package-lock-only` directly in this checkout.** npm
  reads the existing pnpm `node_modules`, walks into `.pnpm/` and dies on a
  symlink it cannot resolve (`Cannot read properties of null (reading
  'matches')`). `pnpm lockfile` resolves in a temp directory and copies the
  result back. Never run a plain `npm install` here either.

  `ray lint` validates lock files only when `CI=true`, and then it demands a
  pnpm-free checkout this repo can never be. That is why the lint step in
  `.github/workflows/ci.yml` clears `CI`; don't remove it. The submission
  lockfile is covered by `pnpm store-check --submission` instead.
- **Change packages only through the CLI**: `pnpm add <pkg>`,
  `pnpm add -D <pkg>`, `pnpm up --latest <pkg>`, `pnpm remove <pkg>`. Never
  type a dependency or version into `package.json`.
- **Check current documentation** before using a library API. Your training
  data may be out of date.
- **Check current Raycast API docs** (developers.raycast.com) and the Memos
  API (`proto/api/v1` in usememos/memos) before using an endpoint.

## Submitting to the store

In order. Stop at the first failure.

1. `pnpm up --latest @raycast/api @raycast/utils`
2. `pnpm lint && pnpm build && pnpm typecheck && pnpm test`
3. Open the built extension in Raycast and walk every command. A distribution
   build is not `pnpm dev`.
4. Capture screenshots into `metadata/` (Window Capture, `Save to Metadata`).
5. Move the `{PR_MERGE_DATE}` entry in `CHANGELOG.md` to the top and make sure
   it describes this release.
6. `pnpm lockfile`
7. `pnpm store-check --submission` — must be green.
8. Commit the lockfile swap on a throwaway branch. `ray publish` validates the
   working directory before it copies anything: it refuses a dirty tree and
   rejects `pnpm-lock.yaml` outright ("pnpm is not supported").

   ```
   git switch -c submission
   git rm pnpm-lock.yaml pnpm-workspace.yaml
   git commit -m "chore(submission): Drop pnpm lockfile for npm"
   ```

9. `pnpm run publish`
10. `git switch main && git branch -D submission`

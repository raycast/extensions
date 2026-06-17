# Contributing

Thanks for helping build this Raycast extension. The codebase is small (one file per command under `src/`) and the workflow is **contracts first** — every command's HTTP layer must pass `npm run qa` (against a running Super Productivity instance) before a PR is mergeable.

## Setup

You'll need:

- **Node 20+** (matches the CI floor — see `engines.node` in `package.json`)
- A running instance of Super Productivity with the Local REST API enabled (port `127.0.0.1:3876`)

```bash
git clone https://github.com/pvnkmnk/raycast-super-productivity.git
cd raycast-super-productivity
npm install
npm run dev
```

`npm run dev` opens Raycast's local development mode for the extension.

## Branch & commit conventions

- **Trunk** is `main`. Every change ships as a PR.
- **Branch format:** `feature/<short-kebab>` or `fix/<short-kebab>` cut from `main`.
- **Commit format:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`. Scope is the command name when it helps (e.g. `feat(view-tasks): ...`).
- **PR title** is the same as the commit subject line for single-commit PRs. Multi-commit PRs use a title summarising the user-visible change.

## Code layout

```
src/
  api.ts                # the only file that talks to /tasks, /projects, /tags, /task-control/*
  <command>.tsx         # one file per Raycast command (View Tasks, Current Task, ...)
  types.ts              # request/response shapes mirrored from SP's Local REST API
  utils.ts              # pure helpers — no fetch, no React
mock-server/
  qa-exercise.js        # mirrors the HTTP layer of every src/<command>.tsx file
  run-qa.js             # probes real SP and spawns qa-exercise.js
.github/workflows/qa.yml  # CI: runs npm run qa on every PR to main
```

When you add a new command, you ship **two things in the same PR**:

1. `src/<new-command>.tsx` — the React component + ActionPanel
2. A new section in `mock-server/qa-exercise.js` that mirrors the same HTTP calls + asserts the response shapes declared in `src/types.ts`

This is what `npm run qa` exercises. Skipping step 2 makes the new command untestable in CI and the PR will be blocked by the GitHub Actions workflow.

## Validation scripts

| Script | What it does | When to run |
|--------|--------------|-------------|
| `npm run qa` | Drives `mock-server/qa-exercise.js` against your running SP instance | Before every commit on a feature |
| `npm run lint` | `ray lint` | Before every PR |
| `npm run build` | `ray build` — produces a `.raycast` package | Before shipping a release-tagged PR |

### One-shot QA

```bash
npm run qa   # probes SP at http://127.0.0.1:3876, runs contract tests
```

Requires a running Super Productivity instance with the Local REST API enabled (`Settings → Misc → Enable local REST API`). Set `SP_API_URL` to test against a remote instance:

```bash
SP_API_URL=http://192.168.1.50:3876 npm run qa
```

### Contract test pattern

When extending the qa-exercise for a new command, follow this template:

```js
console.log("\n<N>. <command-name>");
{
  // 1. fetch the seed data the command needs
  const r = await call("GET", "/<endpoint>");
  const d = expectOk("GET /<endpoint>", r);
  if (d?.[0]) assertShape("Domain shape", d[0], DOMAIN_FIELDS);

  // 2. simulate the user action(s)
  expectOk("Start task", await call("POST", `/tasks/<id>/start`));

  // 3. verify state change
  const after = await call("GET", "/task-control/current");
  expectOk("GET /task-control/current after start", after);
}
```

`assertShape` asserts only the *required* fields declared in `src/types.ts`. Optional fields (e.g. `notes`, `tagIds`) are still asserted when the test exercises them via `expectOk(...)`.

## CI

`.github/workflows/qa.yml` runs `npm run qa` on every PR to `main` and on every push to `main`. A red check blocks merge via branch-protection rules (when configured). Cached `node_modules` keyed on `package-lock.json` keep the job under a minute.

## Adding a new dependency

Use `npm install <pkg>` from inside the project's local toolchain (`npm`, `pnpm`, or `yarn` — match what the project uses; see `package-lock.json`). Do **not** edit `package.json` by hand to bump a version — `npm install` keeps `package-lock.json` consistent.

## Releasing

The Raycast Store publishes happen via `npm run publish` (which `npx @raycast/api@latest publish` wraps). Bump the version in a separate `chore: bump vX.Y.Z` commit; CI must be green on `main` first.

## Where to ask

- File an issue on this repo for extension-specific bugs (auto-focus contract violations, Raycast UI oddities, contract QA failures).
- For SP-side questions (e.g. when `autoStartFocusOnPlay` stops firing for Local REST API starts), file against [super-productivity/super-productivity](https://github.com/super-productivity/super-productivity).

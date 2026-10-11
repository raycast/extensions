# AGENTS.md

Instructions for AI coding agents working on the official Memos extension for
Raycast. People should start with [README.md](README.md).

## Before you write code

1. Read [docs/architecture.md](docs/architecture.md). It's the source of
   truth for the layer map, import direction and how to add a command.
2. Read the `.agents/` files that match your task (see the table below).
3. Follow the Setup command slice. It's a complete, working reference for
   every layer: `setup.tsx → SetupGuide → useConnectionCheck → api/auth → helpers`.

## Non-negotiables

- **Never read `.env` files.** Set values blind, following [.agents/secrets.md](.agents/secrets.md).
- **Never use git worktrees.** Work in the current checkout on the current
  branch. Don't run `git worktree add`, don't create `.worktrees/`, and don't
  turn on any worktree or isolation mode in your agent tool.
- **pnpm only.** Add, upgrade and remove packages with `pnpm add` / `pnpm up` /
  `pnpm remove`. Never hand-edit dependency versions in `package.json`.
- **No comments** unless it's one line explaining _why_ something the code can't express.
- **Commit only when asked**, as scoped Conventional Commits ([.agents/git.md](.agents/git.md)).
- **Verify before you say it's done:** `pnpm lint && pnpm build && pnpm typecheck && pnpm test`.
- **Store rules are not optional.** The extension ships through Raycast's
  review. Read [.agents/store.md](.agents/store.md) before touching
  `package.json`, `assets/`, `metadata/`, `CHANGELOG.md`, `README.md`, or any
  command title, subtitle, action title or navigation title. Run
  `pnpm store-check` afterwards and leave it green.

**Settings live in Raycast preferences.** Never store the instance URL or
token anywhere else (LocalStorage, files, code).

## Rule files

| Read                                           | When                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| [.agents/principles.md](.agents/principles.md) | Always. It's the clean-code core.                                        |
| [.agents/naming.md](.agents/naming.md)         | Naming files, identifiers, commands                                      |
| [.agents/typescript.md](.agents/typescript.md) | Writing any TypeScript                                                   |
| [.agents/raycast.md](.agents/raycast.md)       | Touching commands, components, hooks, the API client, preferences, tests |
| [.agents/store.md](.agents/store.md)           | Manifest, naming, icons, screenshots, changelog, or submitting           |
| [.agents/workflow.md](.agents/workflow.md)     | Running commands, changing dependencies or migrations                    |
| [.agents/git.md](.agents/git.md)               | Writing a commit message                                                 |
| [.agents/secrets.md](.agents/secrets.md)       | Anything involving environment variables                                 |

## Design Context

Touching a command's UI (a `Detail`/`List`/`Form`, its Markdown, icons, or
`ActionPanel`)? Read [PRODUCT.md](.agents/context/PRODUCT.md) (who this is for, positioning,
personality) and [DESIGN.md](.agents/context/DESIGN.md) (the component and copy patterns
already in use, e.g. status-line-first `Detail` views, no-hex colors) first.

## Precedence

1. What the user explicitly asks for.
2. `docs/architecture.md` on structure.
3. `.agents/context/PRODUCT.md` / `.agents/context/DESIGN.md` on product intent and UI patterns.
4. `.agents/store.md` on anything the Raycast review checks.
5. The rest of `.agents/` on style and conventions.
6. Your own defaults.

New code follows the rules. If existing code doesn't match a rule, leave it
unless you're already editing that file for another reason, and even then don't
mass-migrate it.

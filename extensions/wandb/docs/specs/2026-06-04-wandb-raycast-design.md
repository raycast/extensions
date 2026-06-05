# W&B Raycast Extension — Design

Date: 2026-06-04

## Goal

A Raycast extension to browse Weights & Biases and "enter" a project: list
entities → projects → runs, with one-keystroke navigation into each.

## Decisions

- **MVP scope:** project list → drill into the project's run list (not just
  open-in-browser).
- **Auth:** in-app **GUI sign-in** is primary. On launch the key is resolved
  silently from LocalStorage, then `~/.netrc` (`machine api.wandb.ai`, left by
  `wandb login`). If neither exists, an in-app `Form` guides the user:
  open `wandb.ai/authorize` → paste key → validated via a `viewer` query →
  stored in Raycast encrypted LocalStorage. (OAuth was rejected: W&B has no
  Raycast-preconfigured OAuth app.)
- **Entity selection:** top-right `List.Dropdown` (`searchBarAccessory`),
  mirroring the GitHub extension's org picker. Default = the viewer's primary
  entity.

## Architecture

- `wandb.ts` — GraphQL over `https://api.wandb.ai/graphql`, HTTP Basic
  `api:<key>`. Queries verified against the live API:
  - `viewer { username entity teams { edges { node { name } } } }`
  - `entity(name) { projects(first:100) { … name createdAt lastActive } }`
  - `project(name, entityName) { runs(first:50, order:"-createdAt") { … state … } }`
- `netrc.ts` — pure `parseNetrcPassword(content, machine)` + file reader.
- `auth.ts` — LocalStorage token + `resolveToken()` fallback chain.
- `auth-form.tsx`, `project-list.tsx`, `run-list.tsx`, `search-wandb.tsx` — UI.

## Data flow

command → `resolveToken()` →
  none → `AuthForm` (validate → save) →
  token → `getViewer` (dropdown) → `getProjects(entity)` (list) →
  push → `getRuns(entity, project)` (drill-in).

## Error handling

- 401/403 → `AuthError` → toast + clear token → back to sign-in.
- Other GraphQL/network errors → failure toast.

## Testing

- vitest on pure modules: netrc parser, auth-header builder, URL builders.
- UI verified via `ray build` (typecheck + bundle) and `npm run dev`.

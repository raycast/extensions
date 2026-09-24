# Git

## Commit messages

Use Conventional Commits, and always include a scope:

```
<type>(<scope>): <Subject>
```

- **type**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.
- **scope**: kebab-case, naming the area touched: `setup`, `api-client`,
  `preferences`, `docs`, `manifest`. No unscoped commits.
- **Subject**: starts with a capital letter, reads as a sentence in the
  imperative mood, and has no trailing period.
- **Body** (optional): explain _why_, not what.

Examples from this repo:

```
feat(setup): Add guided connection check command
fix(api-client): Retry once on a dropped connection
docs(readme): Explain access token setup
```

## Rules

- **Commit only when asked.**
- **One logical change per commit.** Split unrelated changes.
- **Stage specific paths**, not `git add -A`, so stray files stay out.
- **Never** `--no-verify`, never amend or force-push pushed commits, never push unless asked.

## CHANGELOG.md

Raycast renders this as the extension's version history, so the format is
strict:

```
## [Short Title] - {PR_MERGE_DATE}

- What changed, in the user's words
```

- **Title in square brackets**, hyphen with a space either side.
- **`{PR_MERGE_DATE}` for the unreleased entry** — Raycast substitutes the real
  date when the PR merges. Merged entries keep their `YYYY-MM-DD`.
- **Newest entry first**, and only one `{PR_MERGE_DATE}` entry at a time.
- **Update it in the same commit as the change**, not as a release chore.

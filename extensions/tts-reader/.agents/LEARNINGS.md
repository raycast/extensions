# LEARNINGS

## Corrections

| Date | Source | What Went Wrong | What To Do Instead |
| ---- | ------ | --------------- | ------------------ |
| 2026-03-11 | self | Assumed `.agents/LEARNINGS.md` already existed in this repo | Create the project memory file at task start when it is missing, before continuing with repo changes |
| 2026-04-01 | self | Read project memory from the current workspace before checking the repo being audited | For cross-repo work, read the target repo's `.agents/LEARNINGS.md` before reviewing files or behavior |

## User Preferences

- Use 3-5 subagents for broader repository sweeps when requested.
- Treat rename work as release-prep work: update docs, metadata, and user-facing strings together.

## Patterns That Work

- For validation in this repo, use `pnpm lint` and `pnpm exec tsc --noEmit`; `npm` is not available in the local environment.
- In this Raycast extension, shared "selected text or clipboard fallback" logic is worth keeping in a small helper so command files stay focused on command flow and user messaging.
- Start rename sweeps with a repo-wide `rg` search for historical project names, then audit package metadata and onboarding copy separately.
- For release-prep sweeps, verify `package.json` version, changelog version/date, and the git remote slug together so the rename does not ship half-finished.
- When adding user-facing setup links, verify the target GitHub slug directly with `git ls-remote` so README, changelog, and onboarding stay aligned.

## Patterns That Don't Work

- Assuming a rename is fully covered by search hits alone misses package metadata and store-facing content.

## Domain Notes

- This project is a Raycast extension being prepared for an upcoming release; store metadata and changelog accuracy matter alongside source code.
- As of 2026-03-11, the local git remote still points to `abpai/raycast-pocket-tts-reader`; do not switch it automatically unless the new GitHub repo slug exists.

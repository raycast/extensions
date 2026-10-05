---
name: raycast-extension-release
description: Prepare a Raycast extension release — run TypeScript, lint, test, and build checks locally, fix any errors, update CHANGELOG.md, and draft release notes. Use this skill whenever the user mentions releasing, publishing, preparing a release, cutting a version, updating the changelog, or wants to make sure their code passes CI before pushing. Also trigger when the user says "prepublish", "ship it", "release prep", or asks to check everything before merging.
---

# Raycast Extension Release Preparation

You are preparing a Raycast extension for release. The goal is to catch every issue that CI would catch — and fix it — before the user pushes. Then update the changelog and draft release notes.

This matters because CI failures on TypeScript errors, lint issues, or broken builds waste time and block releases. Running the same checks locally first eliminates surprises.

## Step 1: Pre-release quality gate

Run these checks **in this order**, because each layer catches different problems and earlier fixes can resolve later failures (e.g., a lint autofix might also fix a type error):

### 1a. TypeScript type checking

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

This is the most important check. It catches type errors like null-narrowing issues with discriminated unions, missing properties, and incorrect argument types — the exact kind of errors that slip through to CI.

If there are errors: read the failing files, understand the root cause, and fix them. Common patterns in this codebase:
- **Discriminated union narrowing**: when using `useLanguagePair()`, guard on `!langResult.pair` (not `langResult.error`) so TypeScript narrows the union properly
- **Null assertions**: prefer explicit null guards with early returns over `!` assertions

Re-run `tsc` after fixes to confirm they resolve all errors.

### 1b. ESLint

```bash
npm run lint
```

If there are auto-fixable issues, run `npm run fix-lint` first, then re-check. For remaining manual issues, fix them individually.

### 1c. Tests

```bash
npm run test
```

If tests fail, investigate and fix. Do not skip failing tests.

### 1d. Build

```bash
npm run build
```

This runs `ray build` and validates the full compilation pipeline. Build failures here mean the extension won't work when published.

**If any check fails**: fix the issue, re-run that check, and then re-run all subsequent checks (a fix for one problem can introduce another). Only proceed to Step 2 when all four checks pass cleanly.

## Step 2: Update CHANGELOG.md

The changelog lives at the project root: `CHANGELOG.md`. It surfaces in Raycast under the extension's **Version History** and on the store, so follow Raycast's convention exactly — **not** generic semver.

> Source of truth: Raycast docs — [Prepare an Extension for Store › Version History](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [Versioning](https://developers.raycast.com/information/versioning).

### Raycast changelog rules

- **One h2 section per submission.** Each published update gets its own `## [Title] - {PR_MERGE_DATE}` heading at the **top** of the file (newest first).
- **Title in square brackets**, then ` - ` (hyphen with a space on each side), then the date.
- **Use the literal `{PR_MERGE_DATE}` placeholder** for the new entry — Raycast replaces it with the real merge date on merge (which can be days later, after review). Do **not** type today's date.
- **Flat bullet points** under the heading describing user-visible changes. **No** `### Added / Changed / Fixed / Removed` subsections — Raycast doesn't use them.
- **Never edit an already-published, dated section.** Past entries carry a hard `YYYY-MM-DD` date and are immutable history; new work always goes in a fresh `{PR_MERGE_DATE}` section. Slipping changes into a shipped entry buries them under the wrong date.

Example (matches the Raycast docs):

```markdown
# Brew Changelog

## [Added a bunch of new feedback] - {PR_MERGE_DATE}

- Improve reliability of `outdated` command
- Add action to copy formula/cask name

## [New Additions] - 2022-12-13

- Add greedy upgrade preference
- Add `upgrade` command
```

### Determine what's genuinely new

Raycast extensions aren't released via git tags or `package.json` version bumps, so don't look for those. The "since last publish" range is what's new since the store's current version:

```bash
# npm run publish moves this marker tag to the last-published commit
git log "$(git tag -l '__raycast_latest_publish_ext/*' | head -1)"..HEAD --oneline
```

If you ran `pull-contributions` during this release, the most reliable diff is against the store state directly — compare `CHANGELOG.md` (and the tree) against the contributions parent of the merge so you only list bullets the store doesn't already have:

```bash
git diff <contributions-parent>..HEAD -- CHANGELOG.md
```

Guidelines:
- Each bullet describes a **user-visible** change, not an implementation detail.
- Group related commits into a single bullet when they're one logical change.
- Skip merge commits, CI/config changes, and internal refactors that don't affect behavior.
- After editing, run `npm run lint` — `ray lint` validates the changelog format and accepts `{PR_MERGE_DATE}`.

## Step 3: Draft release notes

After updating the changelog, draft concise release notes suitable for the Raycast Store submission / PR description. Use the new changelog section's title (Raycast extensions have no semver version). The format:

```
**What's new — [changelog section title]**

[2-3 sentence summary of the most important changes]

Highlights:
- [Key change 1]
- [Key change 2]
- [Key change 3]
```

Present the release notes to the user for review — don't commit them automatically.

## Step 4: Summary

Present a summary to the user:
- Which checks passed / what was fixed
- The changelog diff
- The draft release notes
- Any remaining action items — for Raycast that's typically: run `npm run publish` to open/update the PR in `raycast/extensions`, then mark the draft PR **"Ready for review"**. (No version bumps or git tags — Raycast doesn't use them.)

## Important

- Use `npm` to run scripts (not `bun` or `yarn`)
- Do not push to remote or run `npm run publish` without explicit user approval — publishing opens/updates a public PR in `raycast/extensions`
- Raycast extensions have no `package.json` version to bump and no release tags to create — don't invent them
- Commit fixes from Step 1 separately from changelog updates — the user should be able to review each independently

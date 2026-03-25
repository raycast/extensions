# Agent Instructions

This file contains instructions for Claude Code when working on this repository. These guidelines help prevent common mistakes and ensure consistent quality.

---

## Autonomy

Full permissions are granted for this project. Do not ask for confirmation before:
- Reading, editing, or creating files
- Running any shell commands (tests, lint, build, dev, git operations)
- Committing and pushing to the repository (when explicitly asked)

The only exception is the PRD-First Workflow — wait for user approval of PRD changes before proceeding to implementation.

---

## Pre-Commit Checklist

Before every commit, always run:

```bash
git status
```

**Verify:**
1. All modified files that should be committed are staged
2. No unintended files are being committed
3. No files were accidentally modified (e.g., formatting changes from file recreation)

If you deleted and recreated a file, use `git diff <file>` to verify the content is intentionally changed, not just reformatted.

---

## File Recreation Rule

**Never recreate files using `echo` or similar one-liners.** This often changes formatting (e.g., multi-line JSON becomes single-line).

Instead:
- Use the `Edit` tool to modify existing files
- Use `git checkout -- <file>` to restore a file to its last committed state
- If you must recreate a file, use the `Write` tool with properly formatted content

---

## Post-Task Verification

After completing any task that modifies files:

1. Run `git status` to check for uncommitted changes
2. Run `git diff` to review what changed
3. Ensure all intentional changes are committed
4. Ensure no unintentional changes remain

---

## PRD-First Workflow

**Never implement a feature before the user approves the PRD changes.**

The correct order for any new feature or requirement change is:

1. Update `docs/PRD.md` with the new or revised user story and acceptance criteria
2. Stop and present the PRD changes to the user for review
3. Wait for explicit approval of the PRD before proceeding
4. Review `docs/Tech Design.md` and update it to reflect any architectural or design changes required by the feature — new data sources, changed data flow, new design decisions, etc.
5. Implement only what the approved PRD and updated Tech Design describe — no approval needed for Tech Design, but it must be updated before any code is written

If the PRD and implementation end up out of sync, the PRD is wrong — fix the PRD to accurately reflect the actual behaviour, not the other way around.

---

## Documentation Ownership

Each piece of information lives in exactly one place:

- **`CLAUDE.md`**: How to work in this repo — commands, workflow, testing requirements, agent instructions, and pointers to other docs. No architecture or design content.
- **`docs/Tech Design.md`**: All technical architecture, data flow, stack decisions, design decisions, and explored alternatives.
- **`docs/PRD.md`**: All requirements, user stories, and acceptance criteria.

When adding or updating documentation, always ask: does this already exist somewhere else? If the content belongs in `Tech Design.md` or `PRD.md`, put it there — not in `CLAUDE.md`. Never duplicate information across files; update the single source of truth and add a pointer if needed.

---

## After Code Changes

**Always run `npm run dev` after making code changes** so the user has the latest version running in Raycast for testing. Run it in the background so it doesn't block further work.

---

## Dependency Updates

When updating npm dependencies:

1. Always run `npm audit` before and after
2. Run `npm run lint` to verify ESLint compatibility
3. Run `npm test` to verify tests still pass
4. Run `npm run build` to verify build works
5. Commit both `package.json` and `package-lock.json` together

---

## Testing Requirements

Before marking any implementation task as complete:

1. `npm test` - all tests must pass
2. `npm run test:coverage` - coverage must be ≥90%
3. `npm run lint` - no errors
4. `npm run build` - successful build
5. `npm audit` - no high-severity vulnerabilities

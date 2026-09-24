---
name: github-pr-review
description: Use when a user wants to review a GitHub pull request for correctness, assess its changed code and workflow results, or draft actionable review findings.
---

# PR review

## When to use

Use to review a specified pull request or find an open pull request to review.
Return findings in chat. These tools do not submit review comments or run local tests.
Use only the GitHub tools named below and keep the review read-only.

## Workflow

1. Resolve the repository and PR number from the supplied URL or request.
   If necessary, call `search-repositories` or `search-pull-requests` with `query`.
   Scope PR searches with `repo:owner/repo` and the requested state; clarify ambiguity.
2. Read the returned PR metadata for intent, target branch, and commit identity
   where available. Distinguish the author's claims from facts verified in code.
3. Call `get-pull-request-diff` with `repository: "owner/repo"`
   and `pullRequestNumber`. This tool returns changed files and their patches.
   Check the top-level `truncated` flag and each file's `patchTruncated` flag.
   Missing patches, binary files, and unreturned files are review gaps.
4. Review available hunks for concrete failure paths, edge cases, data loss,
   authorization mistakes, and behavior that contradicts the stated change.
   Trace evidence within the returned context. Do not infer unseen callers or files.
   If surrounding code is necessary, request it and label that finding unverified.
5. Call `list-workflow-runs` with `repository` and the PR's head `branch` if known.
   Match a run's commit SHA to the reviewed PR commit before reporting its result.
   If commit identity is unavailable or differs, report that current checks are unverified.
6. Rank findings by impact. Include the affected path, a line or hunk reference
   supported by the patch, the failing scenario, and a concrete correction.
   Separate confirmed defects from questions; omit speculative style complaints.
7. State the review coverage and whether relevant checks passed, failed, or remain
   unknown. An absence of findings is limited to the code and context actually read.

## Output

- PR link and review scope, including commit identity when available.
- Findings ordered by severity: path/location, trigger, impact, evidence, suggested fix.
- Workflow results tied to the reviewed commit, with returned links when available.
- Missing patches, truncation, unverified assumptions, and suggested follow-up checks.

## Do not

- Do not merge, close, reopen, enable auto-merge, or rerun workflows during a review.
- Do not claim to inspect omitted code, run tests, or post a review with these tools.
- Do not present a stale workflow result or an incomplete diff as complete verification.

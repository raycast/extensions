# Existing AI tools

Read the complete manifest and all 16 files in `src/tools/` before writing the skill. Optional inputs carry `?`. These are the registered inputs, not additional tools.

| Tool | Inputs |
| --- | --- |
| [get-notifications](../../src/tools/get-notifications.ts) | `all: boolean`; `participating: boolean`; `since: string`; `before: string` |
| [search-issues](../../src/tools/search-issues.ts) | `query: string` |
| [search-pull-requests](../../src/tools/search-pull-requests.ts) | `query: string` |
| [search-repositories](../../src/tools/search-repositories.ts) | `query: string` |
| [enable-auto-merge](../../src/tools/enable-auto-merge.ts) | `pullRequestId: string`; `mergeMethod?: "MERGE" \| "REBASE" \| "SQUASH"` |
| [disable-auto-merge](../../src/tools/disable-auto-merge.ts) | `pullRequestId: string` |
| [merge-pull-request](../../src/tools/merge-pull-request.ts) | `pullRequestId: string`; `method: "MERGE" \| "REBASE" \| "SQUASH"` |
| [close-pull-request](../../src/tools/close-pull-request.ts) | `pullRequestId: string` |
| [reopen-pull-request](../../src/tools/reopen-pull-request.ts) | `pullRequestId: string` |
| [close-issue](../../src/tools/close-issue.ts) | `issueId: string`; `stateReason: "COMPLETED" \| "NOT_PLANNED"` |
| [reopen-issue](../../src/tools/reopen-issue.ts) | `issueId: string` |
| [list-workflow-runs](../../src/tools/list-workflow-runs.ts) | `repository: string`; `branch?: string` |
| [rerun-workflow-run](../../src/tools/rerun-workflow-run.ts) | `owner: string`; `repo: string`; `runId: string` |
| [cancel-workflow-run](../../src/tools/cancel-workflow-run.ts) | `owner: string`; `repo: string`; `runId: string` |
| [run-workflow](../../src/tools/run-workflow.ts) | `owner: string`; `repo: string`; `workflowId: string`; `ref: string`; `inputs?: string` |
| [get-pull-request-diff](../../src/tools/get-pull-request-diff.ts) | `repository: string`; `pullRequestNumber: number` |

## Behavior and limits

- The explicit diff tool exists and is registered: `get-pull-request-diff` fetches up to three pages of 100 files and applies the shared 400-line patch limit. It returns per-file patchTruncated and top-level truncated flags. Missing binary or unavailable patches cannot be reviewed as text.
- PR search returns title/state/review decision, branch, review body summaries, and a check rollup. It does not return the PR description, complete discussions, or head SHA. Search helpers expose no pagination and exclude archived PRs/issues.
- `list-workflow-runs` returns the Octokit response with runs in `data.workflow_runs`; it has no paging, job, or log inputs. Match returned PR/repository metadata before attributing a run to a PR, especially for forks.
- Native UI helpers can read more GitHub context and submit reviews, but those operations are not registered tools. There is no file-content reader, checkout/test runner, PR-body reader, comment/post-review/approve tool, or guaranteed head-commit snapshot.
- The skill is read-only. The other registered tools can mutate issues, PRs, and workflows and are inventoried here for completeness, not used by review.

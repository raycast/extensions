---
name: jira-bug-triage
description: Use when a user wants to triage a bug report in Jira, check for duplicates, or file or update an issue with verified reproduction details.
---

# Bug triage

## When to use

Use this workflow for a bug report, a possible duplicate, or a request to turn
reproduction notes into a Jira issue. A triage-only request stays read-only.
Use only the Jira tools named below.

## Workflow

1. Identify the reported behavior, expected behavior, reproduction steps,
   environment, and target project from the request. Mark missing facts as unknown.
   Call `get-projects` to resolve the project ID and key. Ask if the project is ambiguous.
2. Call `search-issues` with a project-scoped `jql` using distinctive error text
   and relevant symptoms. Try a second, broader wording if no likely match appears.
   Include resolved issues when checking whether a report is a regression.
3. Call `get-issue` with `issueIdOrKey` for likely matches. Compare the trigger,
   affected behavior, and reproduction details. Explain why each is or is not a duplicate.
   An empty search means no match was found, not that no duplicate exists.
4. Present the proposed outcome: keep an existing issue, update it, or file a new one.
   If the user requested only triage, return the proposal without writing.
   If a write was requested but the target or duplicate decision is ambiguous, clarify it.
5. For a new issue, call `get-issue-types` with `projectId` and select the returned
   bug type. Resolve a requested assignee with `get-users` or `get-myself`.
   Use `get-labels` if labels need resolving. Call `create-issue` with verified IDs,
   `summary`, a Markdown `description`, and the required `confirmation` names.
   Include optional assignment, labels, or due date only when the user supplied them.
6. For an existing issue, read its current description with `get-issue` first.
   Call `update-issue` with `issueIdOrKey`, the requested fields, and
   `confirmation.issueSummary`. Preserve existing details when replacing the description.
   Use `assign-issue` only for requested assignment changes and supply its confirmation.
7. Verify a write with `get-issue`. If a response is uncertain, search or fetch
   before retrying so a successful creation does not produce a second issue.

## Output

- Outcome and a Markdown link to the issue when a URL is available.
- Duplicate candidates with evidence for the decision, plus the search scope.
- Bug details: observed, expected, reproduction, environment, and unknowns.
- Changes actually confirmed, followed by any unresolved questions or failed checks.

## Do not

- Do not invent IDs, reproduction results, severity, owners, or deadlines.
- Do not claim to comment, transition status, set priority, or link duplicate issues;
  these operations are not exposed by this extension's tools.
- Do not overwrite unrelated issue content or create a new issue after an uncertain write.

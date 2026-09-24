---
name: linear-delivery-planning
description: Use when a user wants to turn a spec into Linear issues, triage incoming work, or report progress and risks for a team's cycle.
---

# Delivery planning

## When to use

Use for spec-to-task planning, issue triage, or a cycle status report.
Choose the requested mode; reports and proposed plans remain read-only.
Use only this extension's tools named below.

## Workflow

1. Call `get-current-user`, `get-teams`, and `get-projects` as needed to resolve
   workspace context and IDs. Clarify an ambiguous team or project before proceeding.
   Call `get-members`, `get-labels`, and `get-issue-states` with `teamId` when
   requested assignment, labels, or workflow states need resolving.
2. For a spec, identify the intended outcome, requirements, acceptance criteria,
   and unresolved decisions. Split work into independently verifiable tasks.
   Preserve a source link supplied by the user and label proposed scope as proposed.
3. Call `full-text-search-issues` with plain-text `query` for likely existing work.
   Call `get-issue` with `id` for candidates before treating a task as new.
   Search phrases are not a guarantee that no duplicate exists.
4. For triage, call `list-issues` with the selected `team` or `project` and
   requested state or other filters. Read candidates with `get-issue`.
   Compare symptoms, acceptance criteria, owner, and state; propose the smallest
   necessary update and distinguish duplicates from related work.
5. For a cycle report, call `list-cycles` with `teamId` and the requested `type`
   when applicable. Confirm the returned cycle dates, then call `list-issues`
   with the team and cycle. Include all relevant states, including completed work.
   Follow pagination cursors for searches and lists, including empty pages that
   still have a continuation. Disclose incomplete retrieval instead of reporting totals.
6. Summarize cycle progress from returned issue states and estimates where available.
   Keep issue counts separate from estimate totals; unestimated issues remain explicit.
   Use `get-issue` with `includeRelations: true` for dependencies or blockers
   that matter to the report. Do not infer cycle history from current status alone.
7. If the user asked to create tasks, present or resolve missing required details,
   then call `create-issue` with `teamId`, `title`, a clear `description`,
   and only requested, resolved optional fields. Create a requested parent first
   and reuse its returned ID as `parentId` for children.
8. If the user asked to update work, call `update-issue` with `issueId` and
   only requested fields. Fetch current content before replacing a description
   or label list; preserve unrelated content. Re-read each change with `get-issue`.
   Search or fetch after an uncertain write before retrying a creation.

## Output

- Scope: team, project or cycle, dates, and retrieval limitations.
- Spec mode: tasks with acceptance criteria, dependencies, and existing issue matches.
- Triage mode: issue links, evidence, and proposed or confirmed changes.
- Cycle mode: state counts, completed work, open risks, owners, and next decisions.
- Clearly separate saved changes from recommendations and unresolved questions.

## Do not

- Do not invent IDs, estimates, owners, priorities, blockers, or delivery dates.
- Do not create duplicates or overwrite unrelated issue details during triage.
- Do not report partial pages as full cycle totals or change issues while reporting.

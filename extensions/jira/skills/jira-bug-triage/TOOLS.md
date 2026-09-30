# Existing Jira AI tools

Input inventory reviewed against `package.json` and all 11 files in `src/tools/` on September 24, 2026. All 11 tools are registered. `?` means optional; confirmation objects and their nested fields are required. Source links show the exact implementation.

| Tool | Inputs |
| --- | --- |
| [create-issue](../../src/tools/create-issue.ts) | `projectId: string`; `issueTypeId: string`; `summary: string`; `description?: string`; `assigneeId?: string`; `issueLabels?: string`; `dueDate?: string`; `confirmation: { projectName: string; issueTypeName: string; assigneeName: string; }` |
| [get-users](../../src/tools/get-users.ts) | None |
| [get-projects](../../src/tools/get-projects.ts) | None |
| [get-labels](../../src/tools/get-labels.ts) | None |
| [get-issue-types](../../src/tools/get-issue-types.ts) | `projectId: string` |
| [get-teams](../../src/tools/get-teams.ts) | None |
| [search-issues](../../src/tools/search-issues.ts) | `jql: string` |
| [get-myself](../../src/tools/get-myself.ts) | None |
| [assign-issue](../../src/tools/assign-issue.ts) | `issueIdOrKey: string`; `assigneeId?: string`; `confirmation: { issueSummary: string; assigneeName: string; }` |
| [update-issue](../../src/tools/update-issue.ts) | `issueIdOrKey: string`; `summary?: string`; `description?: string`; `dueDate?: string`; `addLabels?: string`; `removeLabels?: string`; `confirmation: { issueSummary: string; }` |
| [get-issue](../../src/tools/get-issue.ts) | `issueIdOrKey: string` |

## Input and result details

- `search-issues` forwards only `jql`. `getIssuesForAI` requests `maxResults: 50` with fields `summary`, `updated`, `issuetype`, `status`, `priority`, `assignee`, `project`, and `parent`, then returns only the issues array. There are no field-selection, limit, cursor, or offset inputs, and no exposed total or continuation token. Search can match description text without returning it.
- `get-issue` expands `transitions`, `names`, `schema`, and `renderedFields`; those read results do not provide mutation tools. The raw issue can contain ADF description data despite the local type declaring a string. `renderedFields.description` is rendered HTML. Preserve content when converting to Markdown for an edit.
- `get-projects` reads one page of up to 100 projects. `get-users` reads one page and filters to `accountType: "atlassian"`; it has no name-search or project-assignability input. `get-labels` returns one page's values. `get-teams` returns autocomplete suggestions as `teamId`/`displayName`. None accepts pagination or proves that an absent record does not exist.
- `get-issue-types` resolves project-specific creation types from metadata and removes icon URLs. It does not request the expanded required-field definitions. Use returned type IDs, not names, for creation. It is not a priority or custom-field discovery tool.
- `create-issue` requires all three strings in `confirmation`, even when `assigneeId` is omitted. `issueLabels` is comma-separated; `description` is Markdown. `dueDate` is a `YYYY-MM-DD` string parsed through a JavaScript Date and then formatted in the local zone, so verify the stored calendar date against the request. Normal results have `id`, `key`, `self`, and an added browser `url`. A missing response produces an ambiguous success string; search before retrying.
- `update-issue` supports only summary, description, due date, and label additions/removals. It requires `confirmation.issueSummary`. Summary/description/due date are sent only when truthy, so empty strings do not clear them. Description is a complete replacement converted from Markdown to ADF. Labels use individual add/remove operations and preserve unrelated labels. The tool rejects an empty update and may return no body on success.
- `update-issue` uses the OAuth-only wrapper. Other tools use the configured credential selector, which can choose API-token authentication. An API-token read followed by an OAuth update can use different connections; the skill restricts updates to known OAuth use and stops unsupported API-token edits.
- `assign-issue` uses a resolved account ID. Both omission and `""` for `assigneeId` send `null` to unassign. `confirmation.issueSummary` and `confirmation.assigneeName` are required. It may return no body; re-read the issue to verify assignment.
- Source helpers for comments, transitions, attachments, priorities, custom fields, components, and versions are not registered tools. Create/update inputs cannot be extended with those fields. `get-teams` discovers teams but does not provide a way to set one with these issue tools.

# Existing Linear AI tools

Input inventory reviewed against `package.json` and all 78 files in `src/tools/` on September 24, 2026. These 71 tools are registered in the manifest. `?` means an optional input; `[]` means an array. Creation and update requirements are noted below because several tools use one input type for both operations. Source links show the exact implementation.

| Tool | Inputs |
| --- | --- |
| [get-current-user](../../src/tools/get-current-user.ts) | None |
| [create-comment](../../src/tools/create-comment.ts) | `issueId?: string`; `parentId?: string`; `projectUpdateId?: string`; `body: string`; `attachmentPaths?: string[]` |
| [update-comment](../../src/tools/update-comment.ts) | `body: string`; `attachmentPaths?: string[]`; `id: string` |
| [get-documents](../../src/tools/get-documents.ts) | `query?: string`; `initiativeId?: string`; `projectId?: string` |
| [get-document-content](../../src/tools/get-document-content.ts) | `documentId: string` |
| [create-document](../../src/tools/create-document.ts) | `content: string`; `title: string`; `projectId: string` |
| [update-document](../../src/tools/update-document.ts) | `documentId: string`; `content?: string`; `title?: string`; `projectId?: string` |
| [full-text-search-issues](../../src/tools/full-text-search-issues.ts) | `limit?: number`; `cursor?: string`; `query: string` |
| [filter-issues](../../src/tools/filter-issues.ts) | `limit?: number`; `cursor?: string`; `filter: string` |
| [update-issue](../../src/tools/update-issue.ts) | `stateId?: string`; `parentId?: string`; `assigneeId?: string`; `issueId: string`; `projectMilestoneId?: string`; `priority?: number`; `dueDate?: string`; `estimate?: number`; `title?: string`; `labelIds?: string[]`; `projectId?: string`; `description?: string` |
| [create-issue](../../src/tools/create-issue.ts) | `priority?: number`; `stateId?: string`; `parentId?: string`; `assigneeId?: string`; `title: string`; `teamId: string`; `labelIds?: string[]`; `projectId?: string`; `description?: string`; `projectMilestoneId?: string`; `dueDate?: string`; `estimate?: number` |
| [get-teams](../../src/tools/get-teams.ts) | None |
| [get-issue-states](../../src/tools/get-issue-states.ts) | `teamId: string` |
| [get-members](../../src/tools/get-members.ts) | None |
| [get-notifications](../../src/tools/get-notifications.ts) | None |
| [get-labels](../../src/tools/get-labels.ts) | None |
| [add-label](../../src/tools/add-label.ts) | `issueId: string`; `labelId: string` |
| [remove-label](../../src/tools/remove-label.ts) | `issueId: string`; `labelId: string` |
| [get-projects](../../src/tools/get-projects.ts) | None |
| [get-project-updates](../../src/tools/get-project-updates.ts) | `projectId: string` |
| [get-project-statuses](../../src/tools/get-project-statuses.ts) | None |
| [update-project-milestone](../../src/tools/update-project-milestone.ts) | `milestoneId: string`; `name?: string`; `description?: string`; `targetDate?: string` |
| [search-documentation](../../src/tools/search-documentation.ts) | `query: string`; `page?: number` |
| [list-agent-skills](../../src/tools/list-agent-skills.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"` |
| [get-agent-skill](../../src/tools/get-agent-skill.ts) | `id: string` |
| [list-comments](../../src/tools/list-comments.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `issueId?: string`; `projectId?: string`; `initiativeId?: string`; `documentId?: string`; `milestoneId?: string`; `statusUpdateId?: string`; `statusUpdateType?: "project" \| "initiative"` |
| [delete-comment](../../src/tools/delete-comment.ts) | `id: string` |
| [list-cycles](../../src/tools/list-cycles.ts) | `limit?: number`; `cursor?: string`; `teamId: string`; `type?: "current" \| "previous" \| "next"` |
| [list-teams](../../src/tools/list-teams.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `includeArchived?: boolean` |
| [get-team](../../src/tools/get-team.ts) | `query: string` |
| [list-users](../../src/tools/list-users.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `team?: string` |
| [get-user](../../src/tools/get-user.ts) | `query: string` |
| [get-workspace](../../src/tools/get-workspace.ts) | None |
| [list-release-pipelines](../../src/tools/list-release-pipelines.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `team?: string`; `type?: "continuous" \| "scheduled"`; `isProduction?: boolean`; `includeStages?: boolean`; `includeTeams?: boolean`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean` |
| [list-releases](../../src/tools/list-releases.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `pipeline?: string`; `stage?: string`; `stageType?: "planned" \| "started" \| "completed" \| "canceled"`; `version?: string`; `hasReleaseNotes?: boolean`; `includeReleaseNotes?: boolean`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean` |
| [get-release](../../src/tools/get-release.ts) | `id: string`; `includeReleaseNotes?: boolean` |
| [save-release](../../src/tools/save-release.ts) | `id?: string`; `name?: string`; `description?: string`; `version?: string`; `pipeline?: string`; `stage?: string`; `startDate?: string`; `targetDate?: string`; `createdAt?: string`; `startedAt?: string`; `completedAt?: string`; `commitSha?: string` |
| [list-release-notes](../../src/tools/list-release-notes.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `pipeline?: string`; `release?: string`; `includeContent?: boolean`; `includeReleases?: boolean`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean` |
| [get-release-note](../../src/tools/get-release-note.ts) | `id: string`; `includeReleases?: boolean` |
| [save-release-note](../../src/tools/save-release-note.ts) | `id?: string`; `pipeline?: string`; `title?: string`; `content?: string`; `patch?: ContentPatch[]`; `releases?: string[]`; `rangeFromRelease?: string`; `rangeToRelease?: string` |
| [get-document](../../src/tools/get-document.ts) | `id: string` |
| [list-documents](../../src/tools/list-documents.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `projectId?: string`; `initiativeId?: string`; `teamId?: string`; `creatorId?: string`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean`; `fields?: Field[]` |
| [save-document](../../src/tools/save-document.ts) | `id?: string`; `title?: string`; `content?: string`; `patch?: ContentPatch[]`; `project?: string`; `issue?: string`; `initiative?: string`; `cycle?: string`; `team?: string`; `icon?: string`; `color?: string` |
| [list-issue-labels](../../src/tools/list-issue-labels.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `name?: string`; `team?: string` |
| [create-issue-label](../../src/tools/create-issue-label.ts) | `name: string`; `description?: string`; `color?: string`; `teamId?: string`; `parent?: string`; `isGroup?: boolean` |
| [list-projects](../../src/tools/list-projects.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `state?: string`; `initiative?: string`; `team?: string`; `member?: string`; `label?: string`; `createdAt?: string`; `updatedAt?: string`; `includeMilestones?: boolean`; `includeMembers?: boolean`; `includeArchived?: boolean`; `fields?: Field[]` |
| [get-project](../../src/tools/get-project.ts) | `query: string`; `includeMilestones?: boolean`; `includeMembers?: boolean`; `includeResources?: boolean` |
| [save-project](../../src/tools/save-project.ts) | `id?: string`; `name?: string`; `icon?: string`; `color?: string`; `summary?: string`; `description?: string`; `patch?: ContentPatch[]`; `state?: string`; `startDate?: string`; `startDateResolution?: "halfYear" \| "month" \| "quarter" \| "year"`; `targetDate?: string`; `targetDateResolution?: "halfYear" \| "month" \| "quarter" \| "year"`; `priority?: number`; `addTeams?: string[]`; `removeTeams?: string[]`; `setTeams?: string[]`; `labels?: string[]`; `lead?: string`; `addInitiatives?: string[]`; `removeInitiatives?: string[]`; `setInitiatives?: string[]`; `links?: { url: string; title: string }[]` |
| [list-project-labels](../../src/tools/list-project-labels.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `name?: string` |
| [list-milestones](../../src/tools/list-milestones.ts) | `limit?: number`; `cursor?: string`; `project: string` |
| [get-milestone](../../src/tools/get-milestone.ts) | `project: string`; `query: string` |
| [save-milestone](../../src/tools/save-milestone.ts) | `project: string`; `id?: string`; `name?: string`; `description?: string`; `targetDate?: string` |
| [list-initiative-labels](../../src/tools/list-initiative-labels.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `name?: string` |
| [create-initiative-label](../../src/tools/create-initiative-label.ts) | `name: string`; `description?: string`; `color?: string`; `parent?: string`; `isGroup?: boolean` |
| [get-attachment](../../src/tools/get-attachment.ts) | `id: string` |
| [create-attachment](../../src/tools/create-attachment.ts) | `issue: string`; `filePath: string`; `title?: string`; `subtitle?: string` |
| [delete-attachment](../../src/tools/delete-attachment.ts) | `id: string` |
| [save-comment](../../src/tools/save-comment.ts) | `body: string`; `id?: string`; `parentId?: string`; `issueId?: string`; `projectId?: string`; `initiativeId?: string`; `documentId?: string`; `milestoneId?: string`; `statusUpdateId?: string`; `statusUpdateType?: "project" \| "initiative"` |
| [extract-images](../../src/tools/extract-images.ts) | `markdown: string` |
| [get-issue](../../src/tools/get-issue.ts) | `id: string`; `includeRelations?: boolean`; `includeCustomerNeeds?: boolean`; `includeReleases?: boolean` |
| [list-issues](../../src/tools/list-issues.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `team?: string`; `state?: string`; `cycle?: string`; `label?: string`; `assignee?: string`; `delegate?: string`; `project?: string`; `release?: string`; `priority?: number`; `parentId?: string`; `fields?: IssueField[]`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean` |
| [save-issue](../../src/tools/save-issue.ts) | `id?: string`; `title?: string`; `description?: string`; `patch?: ContentPatch[]`; `team?: string`; `cycle?: string`; `milestone?: string`; `priority?: number`; `project?: string`; `state?: string`; `assignee?: string`; `delegate?: string`; `labels?: string[]`; `dueDate?: string`; `slaBreachesAt?: string`; `slaType?: "all" \| "onlyBusinessDays"`; `parentId?: string`; `estimate?: number`; `links?: { url: string; title: string }[]`; `setReleases?: string[]`; `addReleases?: string[]`; `removeReleases?: string[]`; `blocks?: string[]`; `blockedBy?: string[]`; `relatedTo?: string[]`; `duplicateOf?: string`; `removeBlocks?: string[]`; `removeBlockedBy?: string[]`; `removeRelatedTo?: string[]` |
| [delete-issue](../../src/tools/delete-issue.ts) | `id: string` |
| [list-issue-statuses](../../src/tools/list-issue-statuses.ts) | `limit?: number`; `cursor?: string`; `team: string` |
| [get-issue-status](../../src/tools/get-issue-status.ts) | `id: string`; `name: string`; `team: string` |
| [list-initiatives](../../src/tools/list-initiatives.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `query?: string`; `status?: string`; `owner?: string`; `leadTeam?: string`; `parentInitiative?: string`; `label?: string`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean`; `includeProjects?: boolean`; `includeSubInitiatives?: boolean`; `fields?: InitiativeField[]` |
| [get-initiative](../../src/tools/get-initiative.ts) | `query: string`; `includeProjects?: boolean`; `includeSubInitiatives?: boolean` |
| [save-initiative](../../src/tools/save-initiative.ts) | `id?: string`; `name?: string`; `summary?: string`; `description?: string`; `patch?: ContentPatch[]`; `color?: string`; `icon?: string`; `status?: string`; `priority?: number`; `targetDate?: string`; `owner?: string`; `leadTeam?: string`; `parentInitiatives?: string[]`; `labels?: string[]` |
| [get-status-updates](../../src/tools/get-status-updates.ts) | `limit?: number`; `cursor?: string`; `orderBy?: "createdAt" \| "updatedAt"`; `type: "project" \| "initiative"`; `id?: string`; `project?: string`; `initiative?: string`; `user?: string`; `createdAt?: string`; `updatedAt?: string`; `includeArchived?: boolean` |
| [save-status-update](../../src/tools/save-status-update.ts) | `type: "project" \| "initiative"`; `id?: string`; `project?: string`; `initiative?: string`; `body?: string`; `health?: "onTrack" \| "atRisk" \| "offTrack"`; `isDiffHidden?: boolean` |
| [delete-status-update](../../src/tools/delete-status-update.ts) | `type: "project" \| "initiative"`; `id: string` |

## Shared types and behavior

- Collection inputs `limit` and `cursor` request one result page, default 50 items and maximum 250. Pass returned `nextCursor` as `cursor`, retaining filters, to continue. `orderBy` is available only where listed. `createdAt` and `updatedAt` filters are inclusive lower bounds; date parsing also accepts durations such as `-P7D`. See [linearUtils.ts](../../src/tools/linearUtils.ts).
- `filter-issues.filter` is a JSON string using the structured fields documented in its source. `full-text-search-issues.query` is plain text, with no operators or team/project inputs. `search-documentation.page` is a zero-based numeric page, with 16 hits per page.
- `Field[]` selects the literal names defined separately in [list-documents.ts](../../src/tools/list-documents.ts) and [list-projects.ts](../../src/tools/list-projects.ts). `IssueField[]` is defined in [issueUtils.ts](../../src/tools/issueUtils.ts); `InitiativeField[]` is defined in [initiativeUtils.ts](../../src/tools/initiativeUtils.ts). Selected fields can replace defaults. In particular, `list-issues` does not include `estimate`, `dueDate`, `completedAt`, `cycleId`, or `statusType` by default.
- `ContentPatch[]` uses `op` plus its operation-specific fields: `replace` takes `old_string`, `new_string`, and optional `replace_all`; `insert_before`/`insert_after` take `anchor` and `text`; `prepend`/`append` take `text`; `replace_range` takes `from`, `to`, and `new_string`. These replace the matching `content` or `description` input, not additional text to send alongside it. See [linearUtils.ts](../../src/tools/linearUtils.ts).
- `save-issue` creates without `id`, requiring `title` and `team`; it updates with `id`. State resolution also needs `team`; milestone resolution needs `project`. `labels` replaces existing labels. `setReleases` cannot be combined with `addReleases`/`removeReleases`. Relation, release, and link writes happen after the issue write, so an error can leave partial success.
- `save-issue` uses the literal string `null` to clear `cycle`, `project`, `assignee`, `delegate`, `dueDate`, `slaBreachesAt`, `parentId`, or `duplicateOf`; `estimate: -1` clears the estimate. Issue priorities are 0 unset, 1 urgent, 2 high, 3 medium, and 4 low, as documented in `ai.yaml`; the old create/update input comments invert the scale incorrectly.
- `save-project` requires `name` and at least one team via `setTeams` or `addTeams` when creating. A `setTeams` or `setInitiatives` replacement cannot be combined with the corresponding add/remove inputs. `summary` is the short description; `description` is the long content. `lead: "null"` removes the lead.
- `save-document` requires `title` and one parent when creating. `team` can disambiguate a `cycle` parent without becoming a second parent. Parent inputs reparent on update. `save-initiative` requires `name` when creating; `owner: "null"` and `leadTeam: "null"` clear those fields. `save-milestone` requires `project` and, when creating, `name`.
- `save-release` creates with `name` and `pipeline`; changing an existing release's pipeline is unsupported. `save-release-note` creates with `pipeline` plus either `releases` or both release-range inputs; its `patch` is update-only. `save-status-update` needs the appropriate `project` or `initiative` when creating, and `id` when updating.
- `list-comments` requires exactly one of its six parent inputs. `save-comment` uses `id` for editing or `parentId` for replying; a new thread requires exactly one parent. `statusUpdateType` applies only with `statusUpdateId`. Some legacy comment tools support `attachmentPaths`, which `save-comment` does not. `create-attachment.filePath` must be an absolute local path.
- `get-issue` caps each relation, customer-need, release, and attachment collection at 250 without a continuation input. A capped result cannot establish complete history. `extract-images` returns image URLs and metadata from Markdown; despite its manifest description, its implementation does not fetch image bytes.

The unregistered `create-project-update.ts` and `get-initiatives.ts` files are not callable AI tools. The other five files are helpers: `commentUtils.ts`, `formatConfirmation.ts`, `initiativeUtils.ts`, `issueUtils.ts`, and `linearUtils.ts`.

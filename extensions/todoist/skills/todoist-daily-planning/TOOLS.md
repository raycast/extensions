# Existing Todoist AI tools

Input inventory reviewed against `package.json` and all 30 files in `src/tools/` on September 24, 2026. These 29 tools are registered. `?` means optional; nested objects retain their field names and types. Source links show the exact implementation.

| Tool | Inputs |
| --- | --- |
| [get-other-data](../../src/tools/get-other-data.ts) | `resource_types: string` |
| [get-tasks](../../src/tools/get-tasks.ts) | `query: string`; `lang?: string` |
| [get-completed-tasks](../../src/tools/get-completed-tasks.ts) | None |
| [create-task](../../src/tools/create-task.ts) | `content: string`; `description?: string`; `project_id?: string`; `due?: { string?: string; timezone?: string; lang?: "en" \| "da" \| "pl" \| "zh" \| "ko" \| "de" \| "pt" \| "ja" \| "it" \| "fr" \| "sv" \| "ru" \| "es" \| "nl" \| "fi" \| "nb" \| "tw"; date?: string; }`; `deadline?: { date: string; }`; `duration?: { unit: "minute" \| "day"; amount: number; }`; `priority?: number`; `parent_id?: string`; `child_order?: number`; `section_id?: string`; `day_order?: number`; `collapsed?: boolean`; `labels?: string`; `assigned_by_uid?: string`; `responsible_uid?: string`; `auto_reminder?: boolean`; `auto_parse_labels?: boolean` |
| [update-task](../../src/tools/update-task.ts) | `id: string`; `content?: string`; `description?: string`; `due?: { string?: string; timezone?: string; lang?: "en" \| "da" \| "pl" \| "zh" \| "ko" \| "de" \| "pt" \| "ja" \| "it" \| "fr" \| "sv" \| "ru" \| "es" \| "nl" \| "fi" \| "nb" \| "tw"; date?: string; }`; `deadline?: { date: string; }`; `priority?: number`; `collapsed?: boolean`; `labels?: string`; `assigned_by_uid?: string`; `responsible_uid?: string`; `day_order?: number` |
| [move-task](../../src/tools/move-task.ts) | `id: string`; `project_id?: string`; `section_id?: string`; `parent_id?: string` |
| [complete-task](../../src/tools/complete-task.ts) | `id: string` |
| [uncomplete-task](../../src/tools/uncomplete-task.ts) | `id: string` |
| [delete-task](../../src/tools/delete-task.ts) | `id: string` |
| [get-projects](../../src/tools/get-projects.ts) | None |
| [create-project](../../src/tools/create-project.ts) | `name: string`; `color?: string`; `parent_id?: string`; `child_order?: number`; `is_favorite?: boolean`; `view_style?: "list" \| "board"` |
| [update-project](../../src/tools/update-project.ts) | `id: string`; `name?: string`; `color?: string`; `collapsed?: boolean`; `is_favorite?: boolean`; `view_style?: "list" \| "board"` |
| [move-project](../../src/tools/move-project.ts) | `id: string`; `parent_id?: string` |
| [archive-project](../../src/tools/archive-project.ts) | `id: string` |
| [delete-project](../../src/tools/delete-project.ts) | `id: string` |
| [create-section](../../src/tools/create-section.ts) | `name: string`; `project_id: string`; `section_order?: number` |
| [update-section](../../src/tools/update-section.ts) | `id: string`; `name?: string`; `collapsed?: boolean` |
| [move-section](../../src/tools/move-section.ts) | `id: string`; `project_id: string` |
| [delete-section](../../src/tools/delete-section.ts) | `id: string` |
| [create-label](../../src/tools/create-label.ts) | `name: string`; `color?: string`; `item_order?: number`; `is_favorite?: boolean` |
| [update-label](../../src/tools/update-label.ts) | `id: string`; `name?: string`; `color?: string`; `item_order?: number`; `is_favorite?: boolean` |
| [delete-label](../../src/tools/delete-label.ts) | `id: string` |
| [create-filter](../../src/tools/create-filter.ts) | `name: string`; `query: string`; `color?: string`; `item_order?: number`; `is_favorite?: boolean` |
| [update-filter](../../src/tools/update-filter.ts) | `id: string`; `name?: string`; `query?: string`; `color?: string`; `item_order?: number`; `is_favorite?: boolean` |
| [delete-filter](../../src/tools/delete-filter.ts) | `id: string` |
| [get-comments](../../src/tools/get-comments.ts) | `task_id?: string`; `project_id?: string` |
| [add-comment](../../src/tools/add-comment.ts) | `item_id: string`; `content: string`; `uids_to_notify?: string` |
| [update-comment](../../src/tools/update-comment.ts) | `id: string`; `content: string` |
| [delete-comment](../../src/tools/delete-comment.ts) | `id: string` |

## Input and result details

- [get-sections.ts](../../src/tools/get-sections.ts) exists with optional `project_id: string`, but it is not registered in the manifest. The skill reads sections with `get-other-data` instead.
- `get-other-data.resource_types` is a string parsed into resource names. JSON-array strings are preferred, for example `"[\"items\",\"projects\",\"sections\",\"labels\",\"user\"]"`. Its raw sync response may contain a full baseline or incremental changes. It cannot accept `sync_token` or request a forced full sync. Keep baseline records and merge changes by ID; absence from an incremental response is not deletion.
- `get-tasks` requires `query`; no `project_id`, `section_id`, `label`, `cursor`, or `limit` is accepted despite older manifest instructions. Comma-separated filter lists are unsupported. The tool returns only the first page's `results`, with priorities converted to 1 for P1 through 4 for P4. Raw sync items use 4 for P1 through 1 for P4.
- `get-projects` returns the raw projects response. `get-comments` needs either `task_id` or `project_id` and returns the raw comments response. Neither exposes a pagination input. `get-completed-tasks` returns one page from the completed activity feed without date or cursor inputs; it does not prove a complete historical count.
- `create-task` and `update-task` take displayed priority numbers, with 1 highest. `labels` accepts a JSON-array string or comma-separated label names; updates replace the set. Use `"[]"` to clear labels; an empty string is omitted. `due` is an object, typically `{ string: "tomorrow" }`, and cannot be null in these inputs. Use `due` for ordinary scheduling; paid `deadline` and creation-only `duration` are explicit opt-ins. Updates do not accept duration, project, section, or parent fields.
- Task creation filters out invalid/empty deadline and duration values. Valid duration has unit `minute` or `day` and a positive integer amount. `parent_id` and `section_id` are declared strings even where comments mention null, so null is not an available tool input. Keep dates and structured attributes outside `content`; the interactive Quick Add command is not a registered AI tool.
- `move-task` accepts one intended destination among project, section, and parent. Section or parent moves require the task to be in the destination's project. The tool has no explicit detach-parent or clear-section operation. `move-project` passes omitted `parent_id` through as undefined; its comment describes a root move, but the skill does not depend on that behavior.
- Sync mutations return `sync_status`, potentially changed resource records, and `temp_id_mapping` for new objects. They do not return a normalized task object. Each invocation generates a fresh command UUID, so inspect uncertain results before retrying. `complete-task` uses `item_close`; recurring tasks may advance to the next occurrence instead of disappearing.
- Comment creation uses `item_id`, while comment reads use `task_id`. `uids_to_notify` is a JSON-array string or comma-separated user IDs. Reading a comment does not authorize posting one.
- `ProjectViewStyle` resolves to `"list" | "board"` from `src/api.ts`. Creation/update IDs must come from available records; missing project, label, or section metadata is not permission to invent an ID or create a replacement.

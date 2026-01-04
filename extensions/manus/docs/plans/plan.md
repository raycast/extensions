Below is a concrete plan for building a **Raycast extension that talks to Manus via the Projects / Tasks / Files / Webhooks APIs** listed in your `docs/manus-api/README.md`.

I’m going to assume you want a “daily-driver” workflow: **quickly create a task from Raycast**, then **track status + view results**, with optional **projects/files/webhook tooling**.

---

## 1) What Raycast gives you (the pieces you’ll rely on)

Raycast extensions are built with **TypeScript + React + Node**, and you compose UIs using built-in components like **List / Detail / Form** and interactions via **ActionPanel**. ([Raycast Developers][1])

Key platform features you’ll use:

- **Manifest (`package.json`)**: Raycast-specific config lives in your extension’s `package.json` manifest (a superset of npm’s package.json). ([Raycast Developers][2])
- **Preferences**: Define required preferences (like your Manus API key) so Raycast forces setup before commands open; use `getPreferenceValues()` and `openExtensionPreferences()`. ([Raycast Developers][3])
- **Secure storage model**: Raycast is “local-first”; password preferences + storage APIs store data in a local encrypted database (and secure data can use Keychain mechanisms). ([Raycast Developers][4])
- **Async data hooks**: `useCachedPromise` (SWR-style cache) gives a great UX for Lists (including pagination support). ([Raycast Developers][5])
- **Background refresh**: You can schedule `no-view` or `menu-bar` commands at intervals and detect `environment.launchType` to update command subtitles / refresh menu bar / do light sync. ([Raycast Developers][6])
- **Feedback**: `showToast` for progress/errors; `showHUD` for “I did something and Raycast is closing” confirmations. ([Raycast Developers][7])

---

## 2) Manus API surface you’ll map into Raycast commands

From your README, you have: **Projects**, **Tasks**, **Files**, **Webhooks**.

From the official Manus API docs:

- Base URL examples use `https://api.manus.ai/...` and authentication is via an `API_KEY` header. ([Manus API][8])
- Tasks: list (`GET /v1/tasks`) supports cursor pagination and filtering (`after`, `limit`, `query`, `status[]`, `project_id`, etc.). ([Manus API][9])
- Task lifecycle statuses include `pending`, `running`, `completed`, `failed`. ([Manus API][9])
- Files: `POST /v1/files` returns a presigned `upload_url` (S3 upload flow). ([Manus API][10])
- Webhooks: `POST /v1/webhooks` registers a URL; `DELETE /v1/webhooks/{webhook_id}` removes it. ([Manus API][11])

---

## 3) Proposed command set (MVP → v1)

### MVP (what I’d build first)

1. **Manus: Tasks** (view command)
   - List tasks with search + status filters + pagination
   - Open a **Task Detail** screen showing output and links/files

2. **Manus: Create Task** (view command)
   - Form: instructions, task mode, project, attachments (optional)
   - After submit: toast + action to open task/share URL

3. **Manus: Quick Task** (no-view command, with argument)
   - From root search: type prompt → create task → show HUD/toast + copy/open link
   - Raycast supports up to **3 command arguments** defined in the manifest. ([Raycast Developers][12])

### v1 (strong daily-driver)

4. **Manus: Projects** (view command)
   - List projects + “Create Project” form/action

5. **Manus: Files** (view command)
   - List recent files
   - Upload file (FilePicker → create file record → PUT to presigned URL)
   - Delete file

### v1.1+ (nice power-user features)

6. **Manus: Background Sync** (no-view scheduled command)
   - Poll running tasks and update command subtitle (`updateCommandMetadata`) like “Running: 2”
   - Optional: minimal notifications when tasks complete (be conservative)

7. **Manus: Webhooks** (view command)
   - Register/delete webhooks **only if the user supplies a public endpoint** (more below)

---

## 4) Extension architecture (clean + scalable)

Suggested structure:

- `src/api/`
  - `client.ts` – low-level request wrapper (baseUrl, API_KEY, fetch, errors)
  - `types.ts` – Manus DTOs (Task, File, Project)
  - `tasks.ts`, `projects.ts`, `files.ts`, `webhooks.ts` – endpoint wrappers

- `src/hooks/`
  - `useTasks.ts` – list/paginate tasks via `useCachedPromise`
  - `useProjects.ts`, `useFiles.ts`

- `src/commands/`
  - `tasks.tsx` (List)
  - `task-detail.tsx` (Detail)
  - `create-task.tsx` (Form)
  - `quick-task.ts` (no-view async)
  - `projects.tsx`, `files.tsx`, `webhooks.tsx`
  - `background-sync.ts` (no-view scheduled)

- `src/lib/`
  - `preferences.ts` – typed preference getters + “missing key” helper screen/action
  - `format.ts` – format status/accessories/markdown
  - `storage.ts` – LocalStorage keys (e.g., last seen task IDs)

Why this works well in Raycast:

- UIs stay thin; logic lives in hooks/api layer.
- `useCachedPromise` gives caching + “keepPreviousData” for non-flickery lists. ([Raycast Developers][5])
- Storage is shared across commands in your extension (so background sync can write and Tasks command can read). ([Raycast Developers][13])

---

## 5) Manifest plan (`package.json`)

Raycast config lives in `package.json` manifest. ([Raycast Developers][2])

### Shared preferences

- `apiKey` (type `password`, required)
- `baseUrl` (textfield, default `https://api.manus.ai`)
- optional: `defaultProjectId`, `defaultTaskMode`

Raycast preference types include `password`, `textfield`, `dropdown`, etc. ([Raycast Developers][3])

### Commands and arguments

- `quick-task` uses **arguments** so users can enter instructions from root search (no UI needed). ([Raycast Developers][12])
- `background-sync` uses `mode: "no-view"` and `interval: "10m"` (or similar) for background refresh. ([Raycast Developers][6])

---

## 6) Manus API client design (what to implement)

### Preferences + auth

- Read `apiKey` and `baseUrl` with `getPreferenceValues()`. ([Raycast Developers][3])
- If missing/invalid, render a `Detail` screen explaining and offering **Open Extension Preferences** via `openExtensionPreferences()`. ([Raycast Developers][3])

### Request wrapper

- `request<T>(path, { method, query, body })`
- Add header: `API_KEY: <key>`
- Parse JSON and normalize errors into a friendly message shown via toast. (Raycast feedback patterns: toast/hud/alerts). ([Raycast Developers][14])

### Endpoint wrappers (mirroring README)

- Projects: create/list
- Tasks: create/list/get/update/delete
- Files: create/list/get/delete
- Webhooks: create/delete

Use official docs to shape models + query params:

- `GET /v1/tasks` filters + pagination. ([Manus API][9])
- task output includes content items with `text`, `fileUrl`, `fileName`, `mimeType`. ([Manus API][9])

---

## 7) UI/UX implementation per command

### A) Manus: Tasks (List)

Use a Raycast `<List>` with:

- Search bar → map to Manus `query` parameter. ([Manus API][9])
- Status filter (pending/running/completed/failed) → map to Manus `status[]`. ([Manus API][9])
- Pagination → use `useCachedPromise` pagination support + Manus `after/last_id/has_more`. ([Raycast Developers][5])

Actions per list item:

- Open Detail
- Refresh (call `revalidate()`)
- Copy task ID (built-in copy actions encouraged). ([Raycast Developers][15])
- Open task in browser (if `metadata.task_url` exists) via built-in open action. ([Raycast Developers][15])
- Delete task (confirm alert, then `DELETE /v1/tasks/{task_id}`). ([Manus API][16])

### B) Task Detail (Detail)

Use `<Detail>` to render:

- Markdown: the most recent “assistant” output, plus a section listing attachments/files with links
- Metadata: status, created_at, credit usage, project, etc.

If output includes downloadable files, add actions:

- Open file URL in browser
- Copy URL
- (optional) download to a temp folder and “Open” (Node fs)

Manus Get Task describes output + mentions `convert` query param (for pptx conversion), which you could expose as an action like “Open converted PDF”. ([Manus API][17])

### C) Manus: Create Task (Form)

Use `<Form>` with:

- `Form.TextArea` instructions
- `Form.Dropdown` task mode (e.g., “agent/chat/adaptive” if you want to expose it)
- Project selection dropdown (populate via list projects)
- Attachments:
  - `Form.FilePicker` for local files (then do the Manus upload flow) ([Raycast Developers][18])
  - Optional: URL attachments as text field(s)

On submit:

1. If files selected: call `POST /v1/files` → receive `upload_url` and `file_id`, then `PUT` file bytes to `upload_url`. ([Manus API][10])
2. Call `POST /v1/tasks` with the attachments + settings. ([Manus API][19])
3. `showToast` success and provide actions to:
   - Open task URL / share URL
   - Copy share URL to clipboard ([Raycast Developers][15])

(Consider enabling drafts in the form so users don’t lose a half-written prompt; Raycast supports drafts in forms.) ([Raycast Developers][20])

### D) Manus: Quick Task (no-view + argument)

Raycast supports **no-view commands** (no UI) and command **arguments** configured in the manifest. ([Raycast Developers][12])

Flow:

- Read `props.arguments.prompt`
- Create task
- `showHUD("Task created")` + copy link to clipboard and/or open in browser ([Raycast Developers][7])

This becomes your fastest workflow.

### E) Projects / Files commands

- Projects list + create project (simple form)
- Files list (10 most recent per README; verify with official docs when implementing)
- Upload file = same flow as above
- Delete file via `DELETE /v1/files/{file_id}` (and refresh list)

---

## 8) Background refresh strategy (optional but very “Raycast-native”)

Raycast supports scheduling `no-view` and `menu-bar` commands at intervals, with `environment.launchType` to know if it’s background or user-launched. ([Raycast Developers][6])

Two good options:

### Option 1: Root-search “status subtitle”

Add a scheduled `no-view` command:

- `GET /v1/tasks?status[]=running&limit=1` (or fetch count via bigger limit)
- `updateCommandMetadata({ subtitle: "Running: N" })` ([Raycast Developers][6])

This is low-noise and gives value even when you don’t open the extension.

### Option 2: Menu bar indicator

A `menu-bar` command can show a small menu bar extra; Raycast unloads it after `isLoading` becomes false (it’s not a long-lived daemon). ([Raycast Developers][21])

(If you care about Windows users, note menu bar commands aren’t available there.) ([Raycast Developers][22])

Background-refresh best practices: keep interval high, finish quickly, handle network/rate limits, defensive state sharing. ([Raycast Developers][6])

---

## 9) Webhooks: how to support them in a Raycast extension

Manus can send lifecycle events to a webhook URL, and will test the endpoint. ([Manus API][23])

A Raycast extension **can’t reliably receive inbound HTTP** from the public internet (it runs locally). So the realistic plan is:

- **In-extension UI**: let the user set a webhook URL they control (e.g., Cloudflare Worker).
- Add commands:
  - “Register Webhook” → `POST /v1/webhooks` with `{ webhook: { url } }` ([Manus API][11])
  - “Delete Webhook” → `DELETE /v1/webhooks/{webhook_id}` ([Manus API][24])

- Store `webhook_id` in Raycast LocalStorage so you can manage it later. ([Raycast Developers][13])

If you want “real-time notifications in Raycast”, the webhook receiver service would need to **store events**, and then your Raycast extension can **poll that service** (via background refresh) to show toasts/updates.

---

## 10) Development + publish checklist

### Dev workflow

- You need to be signed in to use the “Create Extension” developer command in Raycast. ([Raycast Developers][25])
- Raycast CLI is installed with `@raycast/api`; `npx ray help` lists commands, and you’ll use build/lint flows. ([Raycast Developers][26])

### Quality / store readiness

- Follow Raycast store/community/extension guidelines when publishing. ([Raycast Developers][27])
- Never log the API key; use password preferences (stored securely per Raycast security model). ([Raycast Developers][4])
- Keep network calls snappy; use caching and pagination; handle errors with `showToast` and retry actions. ([Raycast Developers][5])

---

## Suggested next action (practical “first sprint”)

1. Scaffold extension (List+Detail template)
2. Add shared preferences (`apiKey`, `baseUrl`) + “missing key” helper screen
3. Implement `src/api/client.ts` + `GET /v1/tasks` and `GET /v1/tasks/{id}`
4. Build **Tasks List** + **Task Detail** (read-only MVP)
5. Add **Create Task** form
6. Add **Quick Task** no-view command with an argument
7. Only then add Files/Projects/Webhooks + background refresh

If you want, I can turn this plan into a concrete “implementation checklist” with exact file names, TypeScript interfaces matching the Manus schemas, and skeleton code for each command and the API client (still keeping it Raycast-idiomatic).

[1]: https://developers.raycast.com/?utm_source=chatgpt.com "Introduction | Raycast API"
[2]: https://developers.raycast.com/information/manifest "Manifest | Raycast API"
[3]: https://developers.raycast.com/api-reference/preferences "Preferences | Raycast API"
[4]: https://developers.raycast.com/information/security "Security | Raycast API"
[5]: https://developers.raycast.com/utilities/react-hooks/usecachedpromise "useCachedPromise | Raycast API"
[6]: https://developers.raycast.com/information/lifecycle/background-refresh "Background Refresh | Raycast API"
[7]: https://developers.raycast.com/api-reference/feedback/hud?utm_source=chatgpt.com "HUD | Raycast API"
[8]: https://open.manus.ai/docs/quickstart "Quickstart - Manus API"
[9]: https://open.manus.ai/docs/api-reference/get-tasks "Get Tasks - Manus API"
[10]: https://open.manus.ai/docs/api-reference/create-file "Create File - Manus API"
[11]: https://open.manus.ai/docs/api-reference/create-webhook?utm_source=chatgpt.com "Create Webhook - Manus API"
[12]: https://developers.raycast.com/information/lifecycle/arguments?utm_source=chatgpt.com "Arguments - Raycast API"
[13]: https://developers.raycast.com/api-reference/storage "Storage | Raycast API"
[14]: https://developers.raycast.com/api-reference/feedback?utm_source=chatgpt.com "Feedback - Raycast API"
[15]: https://developers.raycast.com/api-reference/user-interface/actions?utm_source=chatgpt.com "Actions - Raycast API"
[16]: https://open.manus.ai/docs/api-reference/delete-task?utm_source=chatgpt.com "Delete Task - Manus API"
[17]: https://open.manus.ai/docs/api-reference/get-task "Get Task - Manus API"
[18]: https://developers.raycast.com/api-reference/user-interface/form "Form | Raycast API"
[19]: https://open.manus.ai/docs/api-reference/create-task "Create Task - Manus API"
[20]: https://developers.raycast.com/api-reference/user-interface/form?utm_source=chatgpt.com "Form - Raycast API"
[21]: https://developers.raycast.com/api-reference/menu-bar-commands.md?utm_source=chatgpt.com "developers.raycast.com"
[22]: https://developers.raycast.com/api-reference/menu-bar-commands?utm_source=chatgpt.com "Menu Bar Commands - Raycast API"
[23]: https://open.manus.ai/docs/webhooks?utm_source=chatgpt.com "Webhooks - Manus API"
[24]: https://open.manus.ai/docs/api-reference/delete-webhook?utm_source=chatgpt.com "Delete Webhook - Manus API"
[25]: https://developers.raycast.com/basics/getting-started?utm_source=chatgpt.com "Getting Started - Raycast API"
[26]: https://developers.raycast.com/information/developer-tools/cli?utm_source=chatgpt.com "CLI - Raycast API"
[27]: https://developers.raycast.com/basics/publish-an-extension?utm_source=chatgpt.com "Publish an Extension - Raycast API"

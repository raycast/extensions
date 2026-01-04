Here’s a **detailed, minimalist MVP plan** for a Raycast extension that does **exactly two things**:

1. **Prompt the user to input the Manus API key**
2. **List tasks** with **search**, **status filter**, and **pagination** (cursor-based)

This plan is based on the Manus API surface in your `docs/manus-api/README.md` (Tasks API includes `GET /v1/tasks`).

---

## 0) Hard scope boundaries (to stay minimalist)

**Included (only):**

- A single Raycast command: **“List Tasks”**
- A single extension preference: **“Manus API Key”**
- In the List UI:
  - search text → Manus `query`
  - status dropdown → Manus `status[]`
  - pagination → Manus `after` cursor + `has_more/last_id`

**Explicitly not included:**

- Task creation, task detail view, open-in-browser actions, projects/files/webhooks, background refresh, notifications, caching beyond what Raycast hooks do by default.

---

## 1) Function 1 — Prompt user for Manus API key ✅ DONE

### 1.1 Use Raycast Preferences (not a custom form)

**Why:** Raycast natively supports preferences including a secure `"password"` type, and you can mark it as **required** so the user must fill it in before the command is usable. ([Raycast Developers][1])

### 1.2 Manifest design (package.json)

Add a single extension-level preference:

- `name`: `apiKey`
- `type`: `"password"` (secure entry)
- `required`: `true`

Raycast manifest supports `"password"` and the `required` flag (“must be entered by the user before the extension is usable”). ([Raycast Developers][1])

### 1.3 Runtime access (in code)

In the command:

- Read the key via `getPreferenceValues()` (preferences are delivered as an object keyed by preference name). ([Raycast Developers][2])
- The value type for a `password` preference is `string`. ([Raycast Developers][2])

### 1.4 “Bad key” recovery (still part of function 1)

Even if the preference is set, it could be wrong/revoked. Handle 401/403 by showing a simple error `Detail` with an action to open preferences via `openExtensionPreferences()` (Raycast shows this exact pattern in their docs). ([Raycast Developers][2])

### 1.5 Security note (why this matters)

Manus warns to keep API keys secure and never share them publicly; each key provides full access to the account. ([Manus API][3])
Using a Raycast password preference is the minimal safe default.

---

## 2) Function 2 — List tasks (search + status filters + pagination) ✅ DONE

### 2.1 Manus endpoint and parameters (what you call)

Use:

- `GET https://api.manus.ai/v1/tasks`
- Header: `API_KEY: <api-key>` ([Manus API][4])

Use these query params:

- `query` = search term (title/body search) ([Manus API][4])
- `status[]` = one or more of `pending | running | completed | failed` ([Manus API][4])
- `after` = cursor for pagination (ID of last task from previous page) ([Manus API][4])
- `limit` = page size ([Manus API][4])

Pagination response fields:

- `has_more` tells you if there are more results
- `last_id` is the ID of the last task in the current page and should be used as the next page’s `after` cursor ([Manus API][4])

### 2.2 Raycast UI design (single List screen)

Build one `List` command UI:

#### Search

- Use `onSearchTextChange` to capture user input and perform **server-side** filtering with Manus `query`.
- Since you’re implementing custom (remote) filtering, set `filtering={false}` (Raycast notes filtering is implicitly false when using `onSearchTextChange`). ([Raycast Developers][5])
- Set `throttle={true}` to avoid firing on every keystroke; Raycast recommends it for async filtering (network requests). ([Raycast Developers][5])

#### Status filter (dropdown on the right side of search bar)

Use `searchBarAccessory` with `List.Dropdown` (Raycast’s recommended “second filtering dimension”). ([Raycast Developers][5])

**Minimal dropdown values:**

- `All` (send no `status[]`)
- `Pending`
- `Running`
- `Completed`
- `Failed`

Even though Manus supports an array, the MVP uses **single-select** for simplicity and still satisfies “status filters.” (Implementation: send `status=[selectedStatus]` unless “All”.) ([Manus API][4])

#### Pagination

Raycast `List` supports pagination via a `pagination` prop (requires `@raycast/api` >= 1.69.0). ([Raycast Developers][5])

Use cursor pagination mapping:

- **Raycast cursor** ⇄ **Manus `after`**
- Return `hasMore` ⇄ Manus `has_more`
- Return `cursor` ⇄ Manus `last_id` (next `after`) ([Manus API][4])

### 2.3 Data fetching approach (minimal + Raycast-idiomatic)

Use `useCachedPromise` (or `usePromise`) with built-in pagination support and pass the returned `pagination` object to `<List pagination={pagination} />`. Raycast documents that in pagination mode the hook returns `pagination`, and you can return `cursor` alongside `data` and `hasMore`. ([Raycast Developers][6])

For a smoother UX when search text or status changes:

- Set `keepPreviousData: true` to avoid flickering when arguments change. ([Raycast Developers][6])

### 2.4 List item content (still “listing”, not a new feature)

Display each task as a `List.Item` with:

- **Title**: `metadata.task_title` if present, else a shortened `instructions`
- **Accessory**: status (pending/running/completed/failed)
- **Subtitle**: maybe `id` or a humanized `created_at` timestamp

This uses fields shown in the Get Tasks response schema. ([Manus API][4])

### 2.5 Empty / error states

- Empty results: show an “EmptyView” message (“No tasks found” / “Try another status or search”)
- Invalid key (401/403): show a `Detail` with “Open Extension Preferences” action (function 1 recovery). ([Raycast Developers][2])
- Network failure: let the hook’s default failure toast occur, or customize via `failureToastOptions` (both `usePromise` and `useCachedPromise` support this pattern). ([Raycast Developers][6])

---

## 3) Minimal file structure (only what you need)

- `src/list-tasks.tsx`
  - Renders `<List>`
  - Manages `searchText` + `status` state
  - Uses `useCachedPromise` pagination to fetch tasks

- `src/api/manus.ts`
  - `getTasks({ query, status, after, limit })` wrapper
  - Adds `API_KEY` header and serializes query params

- `src/api/types.ts` (optional but clean)
  - `Task`, `GetTasksResponse`

---

## 4) Step-by-step build checklist (MVP)

### Step A — Manifest ✅ DONE

- Add one command: `"List Tasks"` (mode: `view`)
- Add one preference: `apiKey` (type: `"password"`, required: `true`) ([Raycast Developers][1])

### Step B — Preferences wiring ✅ DONE

- In `list-tasks.tsx`, read `apiKey` via `getPreferenceValues()` ([Raycast Developers][2])
- If request fails due to auth, show error `Detail` + `openExtensionPreferences()` action ([Raycast Developers][2])

### Step C — Manus client ✅ DONE

- Implement `GET /v1/tasks` with:
  - header `API_KEY`
  - params: `query`, `status[]`, `after`, `limit` ([Manus API][4])

- Parse `{ data, has_more, last_id }` ([Manus API][4])

### Step D — List UI ✅ DONE

- `<List filtering={false} throttle={true} onSearchTextChange={setSearchText} />` ([Raycast Developers][5])
- Status dropdown via `searchBarAccessory={<List.Dropdown … />}` ([Raycast Developers][5])

### Step E — Pagination ✅ DONE

- Implement cursor pagination:
  - use hook pagination support (returns `pagination`) ([Raycast Developers][6])
  - map `cursor` → Manus `after`
  - map Manus `last_id` → next cursor
  - map Manus `has_more` → `hasMore` ([Manus API][4])

- Pass `pagination` to `<List pagination={pagination} />` ([Raycast Developers][5])

### Step F — UX polish (still within scope) ✅ DONE

- Use `keepPreviousData: true` to prevent flicker when search/status changes ([Raycast Developers][6])
- Add a minimal empty state message

---

## 5) Definition of Done (acceptance criteria)

**API key prompt**

- On first run, Raycast requires the user to enter the Manus API key (password preference, required). ([Raycast Developers][1])
- If the key is invalid, the command shows a clear error with an action to open preferences. ([Raycast Developers][2])

**List tasks**

- User can:
  - type to search tasks (server-side `query`) ([Manus API][4])
  - select a status filter (dropdown) mapping to `status[]` ([Manus API][4])
  - scroll/load more tasks via pagination (cursor `after`) ([Manus API][4])

---

If you want, I can turn this MVP plan into a **minimal concrete skeleton** (manifest JSON + `list-tasks.tsx` + `manus.ts` wrapper) while still sticking to the “only two functions” constraint.

[1]: https://developers.raycast.com/information/manifest "Manifest | Raycast API"
[2]: https://developers.raycast.com/api-reference/preferences "Preferences | Raycast API"
[3]: https://open.manus.ai/docs/quickstart "Quickstart - Manus API"
[4]: https://open.manus.ai/docs/api-reference/get-tasks "Get Tasks - Manus API"
[5]: https://developers.raycast.com/api-reference/user-interface/list "List | Raycast API"
[6]: https://developers.raycast.com/utilities/react-hooks/usecachedpromise "useCachedPromise | Raycast API"

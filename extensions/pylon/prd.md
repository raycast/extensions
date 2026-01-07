# Pylon Tasks Raycast Extension - PRD

## Overview

A Raycast extension for creating and managing tasks in Pylon with a Linear-like keyboard-first experience. Enables quick task creation for customer accounts with smart defaults and fuzzy search.

**Target User:** Pylon users (support/success teams) who want fast, keyboard-driven task management.

---

## Commands

| Command | Type | Description |
|---------|------|-------------|
| **Create Task** | Form | Quick task creation with fuzzy account search |
| **My Tasks** | List | Tasks assigned to current user |
| **Search by Account** | List | Find tasks for a specific customer |
| **All Tasks** | List | Browse all tasks with filters |

---

## Create Task Form

### Fields

| Field | Type | Required | Default | Behavior |
|-------|------|----------|---------|----------|
| **Title** | Text | Yes | Empty | Auto-focused on open |
| **Account** | Dropdown + Search | Yes | Last used OR preference | Fuzzy search, recents at top |
| **Body** | TextArea | No | Empty | Markdown/plain text |
| **Assignee** | Dropdown | No | Current user ("me") | Searchable user list |
| **Project** | Dropdown | No | None | Shows projects for selected account |
| **Milestone** | Dropdown | No | None | Shows if project selected |
| **Due Date** | Date Picker | No | None | Standard date picker |
| **Status** | Hidden | No | `not_started` | Not shown in form |
| **Visible in Portal** | Checkbox | No | `false` | Customer portal visibility |

### UX Flow

1. User opens "Create Task" command
2. Title field is focused
3. User types title, tabs to Account
4. Account shows recent accounts + fuzzy search as typing
5. On account select, Project dropdown populates (if account has projects)
6. `Cmd+Enter` submits form
7. Toast shows success with task link, or error message

---

## List Views

### My Tasks (Default)

- **Data Source:** `GET /tasks` filtered by `assignee_id = current_user`
- **Display:** Title, Account name, Status badge, Due date
- **Actions:**
  - `Enter` → View task details
  - `Cmd+E` → Edit task
  - `Cmd+Shift+S` → Change status (submenu)
  - `Cmd+C` → Copy task link

### Search by Account

- **Flow:** Searchable account list → Shows tasks for selected account
- **Filters:** Status (all, open, completed)

### All Tasks

- **Data Source:** `GET /tasks` with pagination
- **Filters:** Status, Assignee, Account
- **Sort:** Created date (newest first)

---

## Extension Preferences

| Preference | Type | Required | Description |
|------------|------|----------|-------------|
| **API Token** | Password | Yes | Pylon API bearer token |
| **Default Assignee** | Dropdown | No | Pre-select assignee (defaults to "me") |
| **Default Account** | Text | No | Account ID to pre-select |
| **Default Project** | Text | No | Project ID to pre-select |

---

## API Integration

### Authentication

```
Authorization: Bearer {API_TOKEN}
Base URL: https://api.usepylon.com
```

### Endpoints Used

| Purpose | Method | Endpoint |
|---------|--------|----------|
| Get current user | `GET` | `/me` |
| List users | `GET` | `/users` |
| Search users | `POST` | `/users/search` |
| List accounts | `GET` | `/accounts` |
| Search accounts | `POST` | `/accounts/search` |
| Get account | `GET` | `/accounts/{id}` |
| Create task | `POST` | `/tasks` |
| Update task | `PATCH` | `/tasks/{id}` |
| Delete task | `DELETE` | `/tasks/{id}` |
| List projects | `POST` | `/projects/search` (assumed) |
| List milestones | `POST` | `/milestones/search` (assumed) |

### Task Creation Payload

```json
{
  "title": "string (required)",
  "account_id": "string",
  "assignee_id": "string",
  "body_html": "string",
  "due_date": "RFC 3339 string",
  "project_id": "string",
  "milestone_id": "string",
  "status": "not_started",
  "customer_portal_visible": false
}
```

### Response Handling

- **Success:** Toast with "Task created" + link to task
- **Error 400:** Show validation error message
- **Error 401:** Prompt to check API token in preferences
- **Error 500:** Generic error with retry option

---

## Data Architecture

### Caching Strategy

| Data | Cache Duration | Storage |
|------|----------------|---------|
| Current user | Session | Memory |
| Users list | 5 minutes | Memory |
| Accounts list | 5 minutes | Memory |
| Recent accounts | Persistent | LocalStorage |
| Last used values | Persistent | LocalStorage |

### Local Storage Schema

```typescript
interface LocalStorage {
  recentAccounts: string[];      // Last 10 account IDs
  lastUsed: {
    accountId?: string;
    projectId?: string;
    assigneeId?: string;
  };
}
```

---

## Technical Implementation

### File Structure

```
src/
├── create-task.tsx          # Create Task command
├── my-tasks.tsx              # My Tasks list command
├── search-by-account.tsx     # Account search command
├── all-tasks.tsx             # All Tasks command
├── api/
│   ├── client.ts             # API client with auth
│   ├── tasks.ts              # Task CRUD operations
│   ├── accounts.ts           # Account operations
│   ├── users.ts              # User operations
│   └── types.ts              # API response types
├── hooks/
│   ├── useCurrentUser.ts     # Get logged-in user
│   ├── useAccounts.ts        # Account search hook
│   ├── useUsers.ts           # Users list hook
│   ├── useTasks.ts           # Tasks list hook
│   └── useRecentAccounts.ts  # Recent accounts from storage
├── components/
│   ├── TaskForm.tsx          # Reusable task form
│   ├── TaskListItem.tsx      # Task list row
│   └── AccountDropdown.tsx   # Account search dropdown
└── utils/
    ├── storage.ts            # LocalStorage helpers
    └── dates.ts              # Date formatting
```

### Key Dependencies

```json
{
  "@raycast/api": "^1.104.1",
  "@raycast/utils": "^1.17.0"
}
```

### Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| `Cmd+Enter` | Create form | Submit task |
| `Cmd+N` | Any list | Open Create Task |
| `Tab` | Form | Next field |
| `Shift+Tab` | Form | Previous field |
| `Escape` | Any | Close/cancel |

---

## Success Criteria

1. **Speed:** Create a task in < 5 seconds with keyboard only
2. **Reliability:** Handle API errors gracefully with clear messages
3. **Discoverability:** Smart defaults reduce required input
4. **Consistency:** Matches Raycast extension conventions

---

## Out of Scope (v1)

- Bulk task operations
- Task templates
- Notifications/reminders
- Offline mode
- Task comments
- File attachments

---

## Open Questions (To Verify During Implementation)

1. **Projects/Milestones Search:** Confirm `POST /projects/search` and `POST /milestones/search` endpoints exist
2. **Tasks List Endpoint:** Confirm `GET /tasks` or `POST /tasks/search` exists for listing tasks
3. **Me Endpoint:** Verify `/me` returns current user ID for "assign to me" feature

---

## Implementation Order

1. **Phase 1: API Client & Auth**
   - Set up API client with token from preferences
   - Implement `/me` call to validate token
   - Add error handling

2. **Phase 2: Create Task Command**
   - Basic form with title + account
   - Account fuzzy search
   - Submit to `POST /tasks`

3. **Phase 3: Smart Defaults**
   - Recent accounts storage
   - Last used values
   - "Assign to me" default

4. **Phase 4: List Views**
   - My Tasks list
   - Search by Account
   - All Tasks with filters

5. **Phase 5: Polish**
   - Keyboard shortcuts
   - Loading states
   - Error handling refinement

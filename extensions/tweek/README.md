# Tweek Task Manager — Raycast Extension

A full-featured Raycast extension for [Tweek Calendar & Task Management](https://tweek.so) powered by Tweek's MCP & REST v1 API.

## Features

### 1. Main Dashboard (`Tweek Dashboard`)
- **Today & Weekly View**: Automatically groups tasks into **Overdue**, **Today**, **Upcoming — This Week**, **Later**, and **Someday Lists**.
- **Calendar Switcher**: Switch between any of your Tweek calendars (`ROLE_OWNER`, `ROLE_EDITOR`, `ROLE_VIEWER`) and Someday Lists from the top dropdown.
- **Split-Pane Markdown Details (`⌘ + I`)**: Inspect full Markdown notes, checklists (`2/5`), recurrence cadence, and color badges inline.
- **Inline Quick Add**: Type directly into the Dashboard search bar (e.g. `Review Q4 roadmap @tomorrow #pink`) and press `Enter` to add a task immediately.

### 2. Full Task Management & Bulk Operations
- **Create & Edit (`⌘ + N` / `⌘ + E`)**: Modal form with Calendar selector, Date picker vs. Someday List placement, Color badge picker, Recurrence cadence (`Daily`, `Weekly`, `Monthly`, `Annually`, `Every Weekday`, `Every 2 Weeks`), Markdown notes, and Subtasks.
- **Recurring Task Management**: Supports virtual occurrences (`<taskId>_yyyyMMdd`) and update/delete scopes:
  - `only_this`: Modify/complete/delete only the selected occurrence.
  - `this_and_future`: Apply changes to this and all future occurrences.
  - `all_linked`: Apply changes to the entire recurring series.
- **Bulk Operations (`⌘ + B` / `⌘ + Shift + A`)**: Select multiple tasks to batch complete, batch reschedule (`Today`, `Tomorrow`, `Next Week`), batch recolor, or batch delete (`bulk_create_tasks`, `bulk_update_tasks`, `bulk_complete_tasks`, `bulk_delete_tasks`).

### 3. Quick Add (`Quick Add Task`)
- Zero-UI (`no-view`) command for instant capture from anywhere on macOS.
- Supports inline syntax:
  - `@today`, `@tomorrow`, `@nextweek`, `@someday`, or `@YYYY-MM-DD`
  - `#pink`, `#yellowish`, `#cornflower`, `#mango`, `#greenish`, `#lilac`, `#grey`, `#black`

### 4. Search & Multi-Filter (`Search Tasks`)
- Real-time keyword filtering across task titles, Markdown notes, and checklist items.
- Filter by Date Preset (`Today`, `This Week`, `Overdue`, `Someday`), Calendar, and Color Badge.

---

## Setup & Installation

1. Open **Tweek** (`https://tweek.so`) → **Profile** → **API Settings** → **Personal API Keys** and generate a Personal API Key.
2. Install dependencies and start the Raycast development server:
   ```bash
   cd extensions/tweek
   npm install
   npm run dev
   ```
3. When prompted in Raycast, paste your **Tweek Personal API Key** (`X-API-Key`).

## Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| Complete / Toggle Task | `Enter` |
| Edit Selected Task | `⌘ + E` |
| Create New Task | `⌘ + N` |
| Delete Task (with confirmation) | `⌘ + D` |
| Toggle Split Markdown Detail | `⌘ + I` |
| Open Full Markdown View | `⌘ + P` |
| Copy Task Description | `⌘ + Shift + C` |
| Open Calendar in Tweek | `⌘ + O` |
| Toggle Task for Bulk Operation | `⌘ + B` |
| Select All Visible Tasks | `⌘ + Shift + A` |
| Show / Hide Completed Tasks | `⌘ + Shift + H` |
| Manual Refresh & Invalidate Cache | `⌘ + R` |

# Tududi Changelog

## [1.7.0] - 2025-11-18

### Features

- **API Token Authentication**: Switched from email/password authentication to API token-based authentication for accessing the API.

## [1.6.0] - 2025-10-16

### Features

- **Today Flag in Task Creation**: Added a "today" checkbox to the create task form, defaulting to checked, which is included as a boolean in the POST request body.

## [1.5.0] - 2025-10-08

### Features

- **Priority Color Coding**: Task icons are now tinted based on priority levels (red for high, yellow for medium, blue for low) for quick visual identification.
- **Change Priority Submenu**: Added "Change Priority" submenu in both task list and detail views, allowing users to update task priorities directly with Low, Medium, and High options.

### Technical Improvements

- Added `updateTaskPriority` function for handling priority updates via PATCH requests.
- Updated task icon rendering to use `tintColor` for priority-based coloring.
- Ensured all priority levels have distinct visual indicators.

## [1.4.0] - 2025-10-07

### Features

- **Today Tasks View**: Added a new "Today Tasks" command that displays tasks marked for today, with the same filtering options as the all tasks view.
- **Toggle Today Action**: Added "Mark for Today" / "Unmark from Today" actions in both task list and detail views to toggle the today flag on tasks.
- **Task Detail Indicator**: Tasks marked for today now display "**Marked for Today**" above the description in the task detail view.
- **API Integration**: Implemented toggle-today endpoint with PATCH method for marking/unmarking tasks for today.

### Technical Improvements

- Added `today` boolean field to Task interface.
- Refactored toggle functionality to be shared between all tasks and today tasks views.
- Added logging for debugging API calls.
- Fixed HTTP method for toggle-today endpoint from POST to PATCH.

## [1.3.0] - 2025-10-07

### Features

- **Status Change Menu**: Added a submenu for changing task status directly from the task list and task details views, with Shift+Cmd+S shortcut for quick access.
- **Status Options**: Submenu includes all status options (Not Started, In Progress, Done, Archived, Waiting) for comprehensive status management.

### Technical Improvements

- Refactored task status update logic to be shared between list and detail views.
- Added keyboard shortcut support for efficient workflow.

## [1.2.0] - 2025-10-06

### Features

- **Task Detail Layout**: Rearranged task detail view to display title first, followed by status and due date, then project and tags in a single line with emojis, and notes content last with improved spacing.
- **Navigation Fix**: Fixed task detail navigation to use proper Raycast navigation stack, ensuring back navigation returns to the task list instead of Raycast search.

### Technical Improvements

- Refactored task detail view to use `Action.Push` and a separate `TaskDetail` component for better navigation handling.
- Added extra spacing in task detail markdown for clearer separation between metadata and content.

## [1.1.0] - 2025-10-06

### Features

- **Note Creation Updates**: Modified POST request to use `project_uid` instead of `project_id`, and tags are now sent as a list of tag names (strings)
- **Note Details View**: Changed default action in all-notes list from copy to open details page showing note title and content
- **Browser Integration for Notes**: Added Enter action in note details to open the note in web browser using `${baseUrl}/note/${note_uid}`

### Technical Improvements

- Updated Note interface to include `uid` field
- Added NoteDetail component for displaying note details with markdown rendering

## [1.0.0] - 2025-10-06

### Features

- **Task Management**: View all tasks with comprehensive filtering options (Uncompleted, Completed, All)
- **Task Details**: Press Enter on any task to view detailed information including name, notes, status, priority, and due date
- **Task Completion**: Complete tasks directly from the details view by pressing Enter
- **Browser Integration**: Open tasks in the web browser using their unique identifier
- **Task Creation**: Create new tasks with full form support including:
  - Task name
  - Priority levels (Low, Medium, High)
  - Due date picker
  - Status selection (Not Started, In Progress, Done, Archived, Waiting)
  - Project assignment with dropdown populated from API
  - Tag assignment with multi-select dropdown populated from API
  - Notes/description
- **Visual Indicators**:
  - Empty circles for uncompleted tasks
  - Checked circles for completed tasks
- **Form Reset**: Create task form automatically clears after successful submission
- **API Integration**: Full integration with Tududi API including authentication and real-time updates

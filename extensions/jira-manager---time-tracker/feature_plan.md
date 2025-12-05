# Plan: Jira Manager & Time Tracker Enhancements

This plan outlines the implementation of advanced features to make the Raycast extension a complete powerhouse for Jira management and Time Tracking.

## Phase 1: Issue Transitions (Workflow Management)
**Goal:** Allow users to change issue status (e.g., To Do -> In Progress) directly from Raycast.

1.  **Backend Services (`src/utils/jira.ts`)**:
    *   `getTransitions(issueKey)`: Fetch available transitions for an issue (`GET /issue/{id}/transitions`).
    *   `transitionIssue(issueKey, transitionId)`: Perform a transition (`POST /issue/{id}/transitions`).
2.  **UI Integration**:
    *   Add "Change Status" action to `src/list-my-issues.tsx` and `src/search-for-issues.tsx`.
    *   This action opens a Submenu or a new Screen listing valid transitions.

## Phase 2: Smart Status Automation
**Goal:** Sync Timer actions with Jira Status automatically.

1.  **Start Issue Logic**:
    *   When `startIssue()` is called, check if current status is "To Do" (or configured status).
    *   If yes, automatically try to transition to "In Progress".
2.  **Stop Issue Logic**:
    *   When `stopIssue()` is called, present an option "Move to Done?".

## Phase 3: Daily Worklog Summary
**Goal:** Visualize time logged today to ensure improved productivity tracking.

1.  **Backend Services (`src/utils/jira.ts`)**:
    *   `getWorklogsForUser(accountId, date)`: Use JQL or Worklog API to fetch worklogs.
        *   Likely use `searchIssues` with `worklogAuthor = currentUser() AND worklogDate = startOfDay()`.
2.  **New Command: `daily-summary`**:
    *   Display total time logged today (e.g., "6h 30m").
    *   List breakdown by issue.
    *   Show progress bar towards 8h goal.

## Phase 4: Jira Notifications
**Goal:** View and act on Jira notifications.

1.  **Backend Services**:
    *   `getNotifications()`: Fetch `GET /notification`.
2.  **New Command: `notifications`**:
    *   List notifications (Menions, Assignments).
    *   Action: "Mark as Read" (if API allows), "Open Issue".

## Phase 5: Filter Presets (Quick Access)
**Goal:** Quick access to standard searches.

1.  **Enhance `list-my-issues.tsx`**:
    *   Add a Dropdown to filter by: "My High Priority", "Updated Recently", "Overdue".

## Phase 6: Code Refactoring & release
1.  **Refactor**: Ensure shared components (like `AddComment`) are properly extracted.
2.  **Documentation**: Update README with new capabilities.

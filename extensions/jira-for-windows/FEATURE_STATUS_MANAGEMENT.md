# Status Management Feature Guide

## Overview

Version 1.1.0 adds powerful status management capabilities to the Review Tasks command, allowing you to mark tasks as done or change their status directly from Raycast.

## Features

### 1. Mark as Done (Ctrl+D)

Quickly complete tasks and remove them from your active task list.

**How it works:**
1. Select a task in Review Tasks
2. Press `⌘ + D` or select "Mark as Done" from the action menu
3. Confirm the action in the dialog
4. The extension automatically finds the appropriate "Done" transition
5. Task is marked complete and removed from the list

**What transitions are considered "Done":**
- Transitions containing "done" (case-insensitive)
- Transitions containing "complete" (case-insensitive)
- Target status names containing "done" or "complete"

**Example transitions matched:**
- "Done"
- "Complete"
- "Mark as Done"
- "Close" → "Done"

### 2. Change Status (Ctrl+T)

Transition tasks to any available status in your workflow.

**How it works:**
1. Select a task in Review Tasks
2. Press `⌘ + T` or select "Change Status" from the action menu
3. A submenu appears showing all available transitions
4. Select the desired transition
5. Task status changes and the list refreshes automatically

**Features:**
- Only shows transitions available for the current task
- Transitions are workflow-aware (follows your Jira workflow rules)
- Shows the target status name for each transition
- Handles complex workflows with multiple paths

### 3. Auto-Refresh

After any status change, the task list automatically refreshes to reflect the new state.

**Benefits:**
- See updated status immediately
- Completed tasks are removed from the list
- No need to manually reload

You can also manually refresh anytime by pressing `Ctrl + R`.

## User Flow Examples

### Example 1: Complete a Task

```
1. Open Raycast → "Review Tasks"
2. See task: "FPA-123 - Fix login bug"
3. Press Ctrl+D
4. Confirm "Mark as Done"
5. Toast: "Task marked as done: FPA-123 completed successfully"
6. Task disappears from list (no longer unresolved)
```

### Example 2: Move Task to In Progress

```
1. Open Raycast → "Review Tasks"
2. See task: "TR-456 - Update documentation" (status: To Do)
3. Press Ctrl+T
4. Submenu opens with transitions:
   - "Start Progress" → In Progress
   - "Close" → Done
5. Select "Start Progress"
6. Toast: "Status changed: TR-456 → In Progress"
7. Task remains in list with updated status
```

### Example 3: Review Workflow Options

```
1. Open Raycast → "Review Tasks"
2. See task: "TR-789 - Review design" (status: In Review)
3. Press Ctrl+T
4. Available transitions:
   - "Approve" → Approved
   - "Request Changes" → In Progress
   - "Reject" → Rejected
5. Choose appropriate action based on review outcome
```

## Technical Details

### API Endpoints Used

**Get Transitions:**
```
GET /rest/api/3/issue/{issueKey}/transitions
```
Returns all available transitions for the issue based on:
- Current status
- Workflow configuration
- User permissions

**Apply Transition:**
```
POST /rest/api/3/issue/{issueKey}/transitions
Body: { "transition": { "id": "transitionId" } }
```

### Smart Matching Algorithm

The "Mark as Done" feature uses a smart matching algorithm:

```typescript
const doneTransition = transitions.find(
  (t) =>
    t.name.toLowerCase().includes("done") ||
    t.name.toLowerCase().includes("complete") ||
    t.to.name.toLowerCase().includes("done") ||
    t.to.name.toLowerCase().includes("complete")
);
```

This ensures compatibility with various workflow naming conventions.

### Error Handling

**No "Done" transition available:**
```
Error: No "Done" transition available for TR-123. 
Available transitions: Start Progress, Reject
```

**Permission issues:**
```
Error: You don't have permission to transition this issue
```

**Network errors:**
```
Error: Failed to change status. Please check your connection.
```

## Keyboard Shortcuts (Windows)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl + D` | Mark as Done | Complete task and remove from list |
| `Ctrl + T` | Change Status | Open status transition submenu |
| `Ctrl + R` | Refresh | Reload task list |
| `Enter` | Open in Jira | View full task details |
| `Ctrl + C` | Copy Key | Copy issue key to clipboard |
| `Ctrl + Shift + C` | Copy URL | Copy full Jira URL |

## UI Components

### Action Panel Sections

**Quick Actions:**
- Open in Jira
- Mark as Done
- Change Status (submenu)
- Refresh

**Copy:**
- Copy Issue Key
- Copy Issue URL

### Confirmation Dialog

When marking as done, you'll see:
```
┌─────────────────────────────┐
│ Mark as Done                │
│                             │
│ Are you sure you want to    │
│ mark "Fix login bug" as     │
│ done?                       │
│                             │
│ [Cancel]  [Mark as Done]    │
└─────────────────────────────┘
```

### Status Change Submenu

```
┌─────────────────────────────┐
│ Change Status               │
│ ────────────────────────── │
│ ○ Start Progress            │
│ ○ Move to In Review         │
│ ○ Approve                   │
│ ○ Complete                  │
│ ○ Close                     │
└─────────────────────────────┘
```

## Best Practices

### When to Use Mark as Done (Ctrl+D)
- ✅ Task is completely finished
- ✅ All acceptance criteria met
- ✅ Ready to close/archive
- ❌ Task needs review (use Change Status instead)
- ❌ Task partially complete (use Change Status to update progress)

### When to Use Change Status (Ctrl+T)
- ✅ Moving task through workflow stages
- ✅ Updating progress (To Do → In Progress)
- ✅ Sending for review
- ✅ Rejecting or requesting changes
- ✅ Custom workflow transitions

### Workflow Tips
1. **Check available transitions** before assuming status exists
2. **Use confirmation wisely** - prevents accidental changes
3. **Refresh manually** if list doesn't update (Ctrl+R)
4. **Open in Jira** (Enter) for complex transitions requiring additional fields

## Troubleshooting

### "No Done transition available"

**Cause:** Your workflow doesn't have a standard "Done" transition

**Solution:** 
1. Press `Ctrl + T` to see available transitions
2. Select the appropriate completion transition manually
3. Or update your Jira workflow to include a "Done" transition

### Transition Not Showing

**Cause:** Workflow rules or permissions

**Solution:**
1. Check your permissions in Jira
2. Verify the transition exists for the current status
3. Check workflow conditions/validators

### Task Still Appears After Marking Done

**Cause:** Task resolution might not be set

**Solution:**
1. Open task in Jira (Enter)
2. Verify it's truly resolved
3. Press Ctrl+R to refresh list
4. Check JQL query filters

## Compatibility

- **Jira Cloud**: ✅ Fully supported
- **Jira Server**: ❌ Not supported
- **Jira Data Center**: ❌ Not supported

**API Version:** Uses Jira REST API v3 for transitions

## Future Enhancements

Planned improvements:
- Bulk status changes
- Custom transition fields support
- Status change history
- Transition with comments
- Schedule status changes
- Conditional transitions based on criteria

## Feedback

Found an issue or have suggestions? See the main README for contribution guidelines.

---

**Version:** 1.1.0  
**Last Updated:** 2025-10-21  
**Related Docs:** README.md, CHANGELOG.md, TESTING.md


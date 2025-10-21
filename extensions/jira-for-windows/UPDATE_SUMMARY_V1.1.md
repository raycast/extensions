# Update Summary - Version 1.1.0

## What's New

Your Jira Raycast Extension now supports **status management**! You can mark tasks as done or change their status directly from the Review Tasks command.

## New Features

### 🎯 Mark as Done (Ctrl+D)
Complete tasks instantly without opening Jira.

**How to use:**
1. Open Review Tasks
2. Select a task
3. Press `⌘ + D`
4. Confirm the action
5. Task is marked as complete and disappears from your list

### 🔄 Change Status (Ctrl+T)
Transition tasks through your workflow with a single keystroke.

**How to use:**
1. Open Review Tasks
2. Select a task
3. Press `⌘ + T`
4. Choose from available transitions
5. Task updates instantly

### 🔃 Auto-Refresh
The task list automatically refreshes after any status change, so you always see the current state.

**Manual refresh:** Press `Ctrl + R` anytime

## Updated UI

The action panel now has organized sections:

**Quick Actions:**
- Open in Jira (Enter)
- Mark as Done (Ctrl+D)
- Change Status (Ctrl+T)
- Refresh (Ctrl+R)

**Copy:**
- Copy Issue Key (Ctrl+C)
- Copy Issue URL (Ctrl+Shift+C)

## Technical Changes

### New API Methods

```typescript
// Get available transitions for a task
async getTransitions(issueKey: string): Promise<JiraTransition[]>

// Transition a task to a new status
async transitionIssue(issueKey: string, transitionId: string): Promise<void>

// Quick method to mark as done
async markAsDone(issueKey: string): Promise<void>
```

### New Interface

```typescript
export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory?: {
      name: string;
      colorName: string;
    };
  };
}
```

### API Endpoints Used

- `GET /rest/api/3/issue/{issueKey}/transitions` - Get available transitions
- `POST /rest/api/3/issue/{issueKey}/transitions` - Apply transition

## Files Modified

1. **src/jira-api.ts**
   - Added `JiraTransition` interface
   - Added `getTransitions()` method
   - Added `transitionIssue()` method
   - Added `markAsDone()` method

2. **src/review-tasks.tsx**
   - Added `ChangeStatusSubmenu` component
   - Added `handleMarkAsDone()` function
   - Added `handleChangeStatus()` function
   - Converted `fetchIssues` to reusable function
   - Updated action panel with new actions
   - Added confirmation dialogs

3. **Documentation**
   - Updated README.md with new features
   - Updated QUICKSTART.md with new shortcuts
   - Updated CHANGELOG.md with version 1.1.0
   - Updated TESTING.md with new test cases
   - Created FEATURE_STATUS_MANAGEMENT.md

## Keyboard Shortcuts Reference (Windows)

| Shortcut | Action | New? |
|----------|--------|------|
| `Enter` | Open in Jira | - |
| `Ctrl + D` | Mark as Done | ✅ NEW |
| `Ctrl + T` | Change Status | ✅ NEW |
| `Ctrl + R` | Refresh | ✅ NEW |
| `Ctrl + C` | Copy Key | - |
| `Ctrl + Shift + C` | Copy URL | - |

## Testing Checklist

To test the new features:

- [ ] Open Review Tasks
- [ ] Press Ctrl+D on a task
- [ ] Confirm and verify it disappears
- [ ] Check in Jira that it's marked as done
- [ ] Press Ctrl+T on another task
- [ ] Verify transitions load
- [ ] Select a transition
- [ ] Verify status changes
- [ ] Press Ctrl+R to refresh manually

## User Benefits

1. **Faster Task Management**
   - Complete tasks in 2 clicks instead of opening Jira
   - Change status without context switching

2. **Workflow Flexibility**
   - Works with any Jira workflow
   - Automatically shows only available transitions
   - Respects workflow rules and permissions

3. **Better UX**
   - Confirmation dialogs prevent mistakes
   - Auto-refresh keeps data current
   - Clear error messages
   - Organized action panel

4. **Keyboard-First**
   - All actions have keyboard shortcuts
   - Fast navigation through tasks
   - No mouse required

## Compatibility

- ✅ Jira Cloud
- ✅ All Jira workflows
- ✅ Custom status transitions
- ✅ Permission-aware
- ❌ Jira Server/Data Center (not supported)

## Known Limitations

1. **No Custom Transition Fields**
   - If a transition requires additional fields (e.g., resolution, comment), it may fail
   - Workaround: Open in Jira for complex transitions

2. **"Mark as Done" Matching**
   - Requires transition or target status to contain "done" or "complete"
   - If your workflow uses different names, use "Change Status" instead

3. **Refresh Timing**
   - Small delay before tasks disappear from list
   - This is normal - Jira needs time to process the change

## Upgrade Instructions

The extension is already running in dev mode, so the changes are live!

**To verify:**
1. Open Raycast
2. Go to Review Tasks
3. Check if new keyboard shortcuts work
4. Look for "Mark as Done" and "Change Status" in actions

**If not working:**
1. Stop the dev server (Ctrl+C in terminal)
2. Run `npm run dev` again
3. Try Review Tasks command

## Documentation

For detailed information, see:
- `FEATURE_STATUS_MANAGEMENT.md` - Complete feature guide
- `CHANGELOG.md` - Version history
- `TESTING.md` - Testing checklist
- `README.md` - Updated with new features

## Next Steps

1. **Test the new features** using TESTING.md checklist
2. **Report any issues** you encounter
3. **Provide feedback** on the UX

## Questions?

- How does "Mark as Done" find the right transition?
  → See FEATURE_STATUS_MANAGEMENT.md for details

- Can I customize which transitions appear?
  → They're determined by your Jira workflow configuration

- What if my workflow doesn't have "Done"?
  → Use "Change Status" (⌘+T) to see available options

---

**Version**: 1.1.0  
**Date**: 2025-10-21  
**Status**: ✅ Ready to test  

Enjoy the new status management features! 🚀


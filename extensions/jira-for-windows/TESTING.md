# Testing Guide

This guide will help you test all features of the Jira Raycast Extension.

## Prerequisites

Before testing:
- [ ] Jira API token generated
- [ ] Extension preferences configured
- [ ] Access to at least one Jira project
- [ ] Node.js 22.14+ installed
- [ ] Raycast installed and running

## Installation & Setup Test

1. **Install Dependencies**
   ```bash
   npm install
   ```
   **Expected**: No errors, all dependencies installed

2. **Run in Development Mode**
   ```bash
   npm run dev
   ```
   **Expected**: Extension builds successfully and appears in Raycast

3. **Check Lint**
   ```bash
   npm run lint
   ```
   **Expected**: No linter errors

## Feature Testing Checklist

### 1. Create Task Command

#### Basic Task Creation
- [ ] Open Raycast and type "Create Task"
- [ ] Command appears and opens form
- [ ] Fill in minimum required fields:
  - Title: "Test Task 1"
  - Project: Select any project
  - Issue Type: Select "Task"
- [ ] Submit form (⌘ + ↵)
- [ ] **Expected**: Success toast appears with task key
- [ ] Click "Open in Jira" in toast
- [ ] **Expected**: Browser opens to the new task

#### Full Task Creation
- [ ] Open "Create Task" again
- [ ] Fill in all fields:
  - Title: "Test Task 2 - Full Details"
  - Description: "This is a test task with all fields filled in"
  - Project: Select a project
  - Issue Type: Select "Task"
  - Deadline: Select "In 1 week"
  - Priority: Select "High"
  - Labels: Add 2-3 labels (if available)
- [ ] Submit form
- [ ] **Expected**: Success toast appears
- [ ] Open task in Jira
- [ ] **Expected**: All fields are correctly populated

#### Custom Deadline
- [ ] Open "Create Task"
- [ ] Set Deadline to "Custom"
- [ ] **Expected**: Date picker appears
- [ ] Select a date 2 weeks from now
- [ ] Fill in other required fields
- [ ] Submit
- [ ] **Expected**: Task created with correct due date

#### Project Selection
- [ ] Open "Create Task"
- [ ] **Expected**: Projects dropdown loads with your projects
- [ ] Change project selection
- [ ] **Expected**: Issue types update for the new project
- [ ] **Expected**: Labels update for the new project (if available)

#### Error Handling
- [ ] Open "Create Task"
- [ ] Try to submit without filling Title
- [ ] **Expected**: Error toast "Missing required fields"
- [ ] Try with invalid data
- [ ] **Expected**: Clear error message

### 2. Review Tasks Command

#### Basic Task List
- [ ] Open Raycast and type "Review Tasks"
- [ ] Command appears and opens list
- [ ] **Expected**: Loading indicator shows briefly
- [ ] **Expected**: List of assigned tasks appears
- [ ] **Expected**: Tasks are sorted by deadline (earliest first)

#### Task Information Display
Verify each task shows:
- [ ] Task key (e.g., "PROJ-123")
- [ ] Task title
- [ ] Project name
- [ ] Status with colored indicator
- [ ] Priority (if set)
- [ ] Due date with colored indicator

#### Due Date Indicators
Look for tasks with different due dates:
- [ ] Overdue task shows 🔴 red indicator and "Overdue by X days"
- [ ] Today's task shows 🟠 orange indicator and "Today"
- [ ] Tomorrow's task shows "Tomorrow"
- [ ] Future task shows 🟢 green indicator and "In X days"
- [ ] Task without due date shows "No due date"

#### Priority Indicators
- [ ] High/Highest priority shows ⬆️ arrow (red/orange)
- [ ] Medium priority shows ➖ dash (yellow)
- [ ] Low/Lowest priority shows ⬇️ arrow (blue/gray)

#### Search Functionality
- [ ] Type text in search bar
- [ ] **Expected**: List filters to matching tasks
- [ ] Search by task key (e.g., "PROJ-123")
- [ ] **Expected**: Shows only matching tasks
- [ ] Clear search
- [ ] **Expected**: All tasks return

#### Task Actions
Select a task and test actions:

**Open in Jira:**
- [ ] Press ↵ (Enter)
- [ ] **Expected**: Browser opens to task in Jira

**Mark as Done:**
- [ ] Select a task
- [ ] Press ⌘ + D
- [ ] **Expected**: Confirmation dialog appears
- [ ] Confirm action
- [ ] **Expected**: Success toast appears
- [ ] **Expected**: Task disappears from list (refreshes automatically)
- [ ] Open Raycast again → Review Tasks
- [ ] **Expected**: Task no longer in list

**Change Status:**
- [ ] Select a task
- [ ] Press ⌘ + T
- [ ] **Expected**: Submenu appears with available transitions
- [ ] **Expected**: Transitions load within 1-2 seconds
- [ ] Select a transition (e.g., "In Progress")
- [ ] **Expected**: Success toast with status change
- [ ] **Expected**: List refreshes showing updated status
- [ ] Verify status changed in Jira

**Manual Refresh:**
- [ ] Press ⌘ + R
- [ ] **Expected**: Loading indicator shows
- [ ] **Expected**: List reloads with current data

**Copy Actions:**
- [ ] Press ⌘ + C
- [ ] **Expected**: Issue key copied to clipboard
- [ ] Paste somewhere to verify
- [ ] Press ⌘ + Shift + C
- [ ] **Expected**: Full issue URL copied to clipboard
- [ ] Paste to verify format: `https://your-domain.atlassian.net/browse/PROJ-123`

#### Empty State
- [ ] If you have no assigned tasks, or filter to show none
- [ ] **Expected**: Empty state shows with helpful message

### 3. Authentication & Configuration

#### Valid Credentials
- [ ] Extension works with valid credentials
- [ ] **Expected**: Data loads successfully

#### Invalid Credentials Test
- [ ] Open Raycast preferences
- [ ] Modify API token to be invalid
- [ ] Try to use "Create Task" or "Review Tasks"
- [ ] **Expected**: Clear error message about authentication
- [ ] Restore correct token

#### Invalid Domain Test
- [ ] Change Jira domain to invalid value
- [ ] Try to use extension
- [ ] **Expected**: Clear error message
- [ ] Restore correct domain

### 4. Status Management Features

#### Mark as Done - Success Cases
- [ ] Create a test task in Jira
- [ ] Open Review Tasks, find the task
- [ ] Press ⌘ + D to mark as done
- [ ] Confirm in dialog
- [ ] **Expected**: Task marked as done successfully
- [ ] **Expected**: Task removed from list
- [ ] Verify in Jira that task is in "Done" status

#### Mark as Done - No Transition Available
- [ ] Find task with workflow that has no "Done" transition
- [ ] Press ⌘ + D
- [ ] **Expected**: Error message listing available transitions
- [ ] **Expected**: Clear explanation of what's available

#### Change Status - Multiple Transitions
- [ ] Find task with multiple available transitions
- [ ] Press ⌘ + T
- [ ] **Expected**: All available transitions listed
- [ ] **Expected**: Each shows target status name
- [ ] Select one transition
- [ ] **Expected**: Status changes successfully
- [ ] **Expected**: List refreshes with new status

#### Change Status - Single Transition
- [ ] Find task with only one transition
- [ ] Press ⌘ + T
- [ ] **Expected**: Submenu shows single transition
- [ ] Apply transition
- [ ] **Expected**: Works correctly

#### Change Status - No Transitions
- [ ] Find task in terminal state (e.g., already Done)
- [ ] Press ⌘ + T
- [ ] **Expected**: "No transitions available" message

#### Workflow Edge Cases
- [ ] Test with different Jira workflows
- [ ] Test tasks in different statuses (To Do, In Progress, etc.)
- [ ] Verify transitions respect workflow rules
- [ ] Test with tasks requiring resolution (set automatically)

#### Confirmation Dialog
- [ ] Press ⌘ + D to mark as done
- [ ] Click "Cancel" in confirmation
- [ ] **Expected**: No change to task
- [ ] **Expected**: Task still in list
- [ ] Try again and confirm
- [ ] **Expected**: Task marked as done

#### Auto-Refresh After Changes
- [ ] Note current number of tasks
- [ ] Mark one as done
- [ ] **Expected**: List refreshes automatically
- [ ] **Expected**: Task count decreases
- [ ] Change status of another task
- [ ] **Expected**: List refreshes
- [ ] **Expected**: Status updates immediately

### 5. Edge Cases

#### No Projects Available
- [ ] If account has no projects
- [ ] **Expected**: Empty dropdown with message

#### No Labels in Project
- [ ] Select project with no existing labels
- [ ] **Expected**: Empty tag picker (no crash)

#### Very Long Task Title
- [ ] Create task with 250+ character title
- [ ] **Expected**: Handles gracefully

#### Special Characters
- [ ] Create task with title: "Test 🚀 with émojis & spëcial çhars"
- [ ] **Expected**: Task created successfully with all characters

#### Network Issues
- [ ] Disconnect from internet
- [ ] Try to create task
- [ ] **Expected**: Clear error message about network

## Performance Testing

- [ ] Create task form loads in < 2 seconds
- [ ] Review tasks list loads in < 3 seconds
- [ ] Switching between projects updates fields quickly
- [ ] Search is responsive (no lag)

## Cross-Platform Testing (if applicable)

- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Verify keyboard shortcuts work on both

## Regression Testing

After any code changes:
- [ ] Run all tests above again
- [ ] Verify no existing functionality broke
- [ ] Check for new console errors

## Known Issues to Document

Document any issues you find:

1. Issue: 
   Steps to reproduce:
   Expected:
   Actual:

2. Issue:
   Steps to reproduce:
   Expected:
   Actual:

## Status Management Acceptance Criteria

- [ ] Mark as Done works for standard workflows
- [ ] Change Status shows all available transitions
- [ ] Confirmation dialog prevents accidents
- [ ] Auto-refresh works after status changes
- [ ] Manual refresh works (⌘+R)
- [ ] Error messages are clear and helpful
- [ ] Keyboard shortcuts work correctly
- [ ] Works with different Jira workflows

## Sign Off

- [ ] All core features working
- [ ] All status management features working
- [ ] No critical bugs found
- [ ] Error handling tested
- [ ] Confirmation dialogs tested
- [ ] Auto-refresh tested
- [ ] Documentation accurate
- [ ] Ready for production use

**Tested by**: ________________
**Date**: ________________
**Version**: 1.1.0
**Notes**: ________________

## Automated Testing (Future)

For future versions, consider adding:
- Unit tests for API functions
- Integration tests for Jira API calls
- Component tests for UI
- E2E tests with mock Jira instance


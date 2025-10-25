## **Raycast Task Manager Extension - PRD**
1. Executive Summary

### 1.1 Overview

A Raycast extension that seamlessly integrates with your existing Notion task management database, enabling rapid task capture, status updates, and daily overview directly from the command bar. This extension eliminates context switching and provides instant access to task management functionality.

### 1.2 Goals

- Enable quick task capture without opening Notion
- Provide instant task status updates
- Deliver actionable daily overviews based on task status
- Maintain full compatibility with existing Notion database structure
- Minimize friction in task management workflow

---

## 2. Product Context

### 2.1 User Profile

- Primary Role: UI/UX and Digital Product Designer
- Occasional coding activities
- Interest in emerging technologies (blockchain, crypto, AI)
- Values productivity and efficient workflows

### 2.2 Current Setup

**Notion Database: "My task management database"**
- **Database URL**: `https://www.notion.so/iroshanux/206d1f54b0438013a6fbe6e8effdc72b`
- **Location**: Under "To Do" parent page

### 2.3 Database Schema

The extension will interact with the following properties:

PropertyTypeOptions/Details**Name**TitleTask name**Status**StatusBacklog, To-do, Blocked, In progress, Done**Priority**SelectCritical, High, Medium, Low**Due Date**DateOptional deadline**Planned**DatePlanned execution date**Project**Select12 options (Obsidian, Productivity, PatternedAI, etc.)**Tags**Multi-select13 options (Design, Development, Research, etc.)**Estimated Time**Select15 min, 30 min, 1 hour, 2 hours, 4 hours, 1 day, 2-3 days, 1 week+**Energy Level**SelectHigh Energy, Medium Energy, Low Energy**Progress**Select0%, 25%, 50%, 75%, 100%**Urgency**SelectUrgent, Not Urgent**Importance**SelectImportant, Not Important**Link**URLOptional reference link**Blocked by**RelationLink to blocking tasks

---

## 3. Core Features

### 3.1 Quick Task Capture

**Command**: `Create Task` or `ct`

**User Flow**:
1. User opens Raycast (⌘ + Space)
2. Types command: `Create Task` or `ct`
3. Enters task details through form
4. Task is created in Notion database

**Form Fields** (in order of appearance):
1. **Task Name** (required) - Text input
2. **Project** (optional) - Dropdown with all 12 project options
3. **Status** (optional, default: "To-do") - Dropdown
4. **Priority** (optional) - Dropdown (Critical/High/Medium/Low)
5. **Due Date** (optional) - Date picker
6. **Tags** (optional) - Multi-select dropdown
7. **Estimated Time** (optional) - Dropdown
8. **Energy Level** (optional) - Dropdown

**Smart Defaults**:
- Status: "To-do"
- If due date is today: Priority suggests "High"
- Recent project selection is remembered

**Success Feedback**:
- Toast notification: "✓ Task created: [Task Name]"
- Option to "Open in Notion" or "Create Another"

---

### 3.2 Update Task Status

**Command**: `Update Task` or `ut`

**User Flow**:
1. User opens Raycast
2. Types command: `Update Task` or `ut`
3. Searchable list of active tasks appears (excludes "Done" status)
4. User selects task
5. Quick action menu appears with status options
6. User selects new status
7. Optional: Update progress percentage

**Task List Display Format**:

```
[Priority Icon] Task Name
Project · Due: Today · ⏱ 2 hours
```

**Quick Actions Available**:
- Move to In Progress
- Move to Blocked
- Mark as Done
- Update Progress
- Edit Task (opens detailed form)
- Open in Notion

**Additional Update Options**:
- Update Progress (0%, 25%, 50%, 75%, 100%)
- Update Priority
- Reschedule Due Date
- Add/Update Link

**Success Feedback**:
- Toast notification: "✓ [Task Name] → [New Status]"

---

### 3.3 Daily Overview

**Command**: `Daily Overview` or `do`

**Display Sections**:

#### **Today's Focus** 
Tasks with:
- Due date = Today
- Status: To-do or In progress
- Sorted by: Priority (Critical → High → Medium → Low)

Display format:
```
🔴 [Critical] Design system audit
   PatternedAI · ⏱ 4 hours · 🔋 High Energy
   
🟠 [High] Review pull request
   Development · ⏱ 30 min · 🔋 Medium Energy
```

#### **In Progress** (3 most recent)
Tasks with Status = "In progress"
- Shows progress percentage
- Time since started

#### **Blocked** (if any)
Tasks with Status = "Blocked"
- Highlights blocking dependencies
- Shows "Blocked by" relationship

#### **Overdue** (if any)
Tasks where Due Date < Today AND Status ≠ Done
- Sorted by how overdue (oldest first)
- Red highlight

#### **Completed Today**
Tasks where:
- Status = Done
- Last edited date = Today
- Shows count and celebrates progress

**Summary Stats** (at top):
```
📊 Daily Overview — Tuesday, Oct 21, 2025

Today's Tasks: 5 · In Progress: 3 · Completed: 2 · Overdue: 1
```

**Quick Actions from Overview**:
- Click task → Quick update menu
- Filter by Project
- Filter by Energy Level
- Open full board in Notion

---

## 4. Technical Requirements

### 4.1 Notion API Integration

- Use Notion API v2023-10-31 or later
- Requires Notion integration with database access
- API Key stored securely in Raycast preferences

### 4.2 Data Sync

- Real-time queries (no local caching initially)
- Error handling for API rate limits
- Offline state detection and user notification

### 4.3 Performance

- Task list loads within 1 second
- Search results appear within 300ms
- Task creation completes within 2 seconds

### 4.4 Authentication

- OAuth integration with Notion
- One-time setup flow
- Database selection during setup

---

## 5. User Experience

### 5.1 Command Naming

CommandAliasFunctionCreate TaskctQuick task captureUpdate TaskutUpdate existing taskDaily OverviewdoShow daily summarySearch TasksstFull-text task search

### 5.2 Keyboard Shortcuts

- `Enter` - Select/Confirm
- `⌘ + Enter` - Create and create another
- `⌘ + O` - Open selected task in Notion
- `⌘ + E` - Edit task details
- `⌘ + D` - Mark as Done
- `⌘ + P` - Change priority
- `Esc` - Cancel/Go back

### 5.3 Visual Design

- Follow Raycast design guidelines
- Use emoji/icons for visual scanning: 
  - 🔴 Critical
  - 🟠 High
  - 🟡 Medium
  - ⚪ Low
  - ⏱ Time estimate
  - 🔋 Energy level
  - 📅 Due date
  - ✓ Completed

---

## 6. Extension Settings (Preferences)

Users can configure:
1. **Notion Integration**
   - Connect/Disconnect Notion account
   - Select database
2. **Default Values**
   - Default project
   - Default status for new tasks
   - Default priority
3. **Daily Overview**
   - Start of day time (for "Today" calculation)
   - Maximum tasks to show per section
   - Which sections to display
4. **Notifications**
   - Enable/disable success notifications
   - Show completion celebrations

---

## 7. Future Enhancements (V2+)

### Phase 2

- **Recurring tasks** - Support for repeated tasks
- **Time tracking** - Start/stop timer on tasks
- **Quick notes** - Add notes to tasks from Raycast
- **Templates** - Predefined task templates

### Phase 3

- **AI suggestions** - Smart priority/time estimates
- **Weekly/Monthly views** - Extended planning views
- **Bulk operations** - Multi-task updates
- **Custom views** - User-defined filters

### Phase 4

- **Collaboration** - Assign tasks to others
- **Analytics** - Productivity insights
- **Voice input** - Create tasks via speech
- **Integrations** - Calendar sync, Slack notifications

---

## 8. Success Metrics

### Primary KPIs

- **Daily Active Usage**: Target 5+ interactions/day
- **Task Creation Time**: &lt; 30 seconds average
- **Status Update Time**: &lt; 10 seconds average
- **User Retention**: 70%+ weekly active users

### Secondary Metrics

- Tasks created via extension vs. Notion direct
- Most used commands
- Average time saved per day
- Error rate &lt; 1%

---

## 9. Implementation Phases

### Phase 1: MVP (Weeks 1-3)

- ✓ Notion API integration
- ✓ Create Task command
- ✓ Update Task command (basic status changes)
- ✓ Daily Overview (basic view)
- ✓ Extension settings

### Phase 2: Enhancement (Weeks 4-5)

- ✓ Search Tasks command
- ✓ Advanced filtering in Daily Overview
- ✓ Keyboard shortcuts
- ✓ Error handling improvements

### Phase 3: Polish (Week 6)

- ✓ Performance optimization
- ✓ UI/UX refinements
- ✓ Documentation
- ✓ Testing & bug fixes

---

## 10. Technical Stack

**Development**:
- TypeScript
- Raycast API
- Notion SDK for JavaScript (`@notionhq/client`)

**Dependencies**:

json

```json
{
  "@raycast/api": "^1.64.0",
  "@notionhq/client": "^2.2.14",
  "date-fns": "^3.0.0"
}
```

---

## 11. Open Questions & Decisions

### To Discuss:

1. Should the extension support multiple Notion databases?
2. Do we need offline mode with local caching?
3. Should we add natural language date parsing ("tomorrow", "next monday")?
4. Do we want integration with other Raycast features (Calendar, Reminders)?

### Assumptions:

- Single user/single database initially
- English language only (V1)
- Desktop-only (Raycast limitation)
- Requires active internet connection

---

## 12. Security & Privacy

- No user data stored locally except API credentials
- Credentials stored in Raycast secure storage
- All data transmission via HTTPS
- Compliant with Notion's API terms of service
- No analytics or tracking beyond Raycast defaults

---

## 13. Documentation Requirements

### User Documentation

1. Installation guide
2. Setup tutorial (connecting Notion)
3. Command reference
4. Keyboard shortcuts guide
5. Troubleshooting common issues

### Developer Documentation

1. Architecture overview
2. API integration details
3. Contributing guidelines
4. Testing procedures

---

## Appendix A: Database Property Mapping

typescript

```typescript
interface NotionTask {
  Name: string;                    // Title
  Status: 'Backlog' | 'To-do' | 'Blocked' | 'In progress' | 'Done';
  Priority: 'Critical' | 'High' | 'Medium' | 'Low';
  'Due Date': Date;
  'Planned ': Date;
  Project: string;                 // One of 12 project options
  Tags: string[];                  // Multi-select
  'Estimated Time': string;        // Time option
  'Energy Level': string;          // Energy option
  Progress: '0%' | '25%' | '50%' | '75%' | '100%';
  Urgency: 'Urgent' | 'Not Urgent';
  Importance: 'Important' | 'Not Important';
  Link: string;
  'Blocked by ': string;           // Relation
}
```

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Author**: Product Requirements for Raycast Extension
**Status**: Draft for Review
# Future Features & Enhancements

This document tracks potential features and improvements for the Jira Manager & Time Tracker extension.

**Note**: The top 3 recommended features have been implemented! See the CHANGELOG for details.

## 🚀 High Priority (Recommended)

### ✅ 1. View Issue Details
**Status**: ✅ IMPLEMENTED  
**Priority**: High  
**Effort**: Medium  
**Description**: View comprehensive issue details without opening browser
- Full description with formatting
- Recent comments
- Worklog history
- Subtasks list
- Attachments
- Linked issues
- Change history
- Custom fields

**Value**: Reduces context switching, keeps workflow in Raycast

---

### ✅ 2. Worklog Summary / Weekly Report
**Status**: ✅ IMPLEMENTED  
**Priority**: High  
**Effort**: Medium  
**Description**: Comprehensive time tracking reports
- Time logged per issue/project this week
- Comparison with previous weeks
- Daily breakdown
- Export capabilities
- Visual distribution

**Value**: Essential for timesheet reporting and productivity tracking

---

### ✅ 3. My Sprints / Active Sprint
**Status**: ✅ IMPLEMENTED  
**Priority**: High  
**Effort**: Medium-High  
**Description**: Sprint-focused view for agile teams
- Current sprint issues
- Issues grouped by status
- Sprint progress indicators
- Your assigned sprint tasks
- Quick sprint statistics

**Value**: Critical for agile/scrum workflows

---

## 📋 Medium Priority

### ✅ 4. Quick Transition
**Status**: ✅ IMPLEMENTED
**Priority**: Medium
**Effort**: Low
**Description**: Ultra-fast status changes
- direct issue key input
- immediate status selection

### ✅ 5. Saved Filters / Quick Filters
**Status**: ✅ IMPLEMENTED
**Priority**: Medium
**Effort**: Medium
**Description**: Access to Jira saved filters
- Integrated into "Search for Issues" filter dropdown

### ✅ 6. Assign Issue
**Status**: ✅ IMPLEMENTED
**Priority**: Medium
**Effort**: Low
**Description**: Quick issue assignment
- Search user by name
- Direct assignment

### ✅ 7. Link Issues
**Status**: ✅ IMPLEMENTED
**Priority**: Medium
**Effort**: Medium
**Description**: Create issue relationships
- Source and Target keys
- Link type selection

### ✅ 8. Watch/Unwatch Issues
**Status**: ✅ IMPLEMENTED
**Priority**: Medium
**Effort**: Low
**Description**: Manage issue watchers
- View current watch status (eye icon)
- Start/Stop watching directly from issue lists and details

---

## 🎨 Nice to Have

### 9. Create Issue from Template
**Status**: 💡 Idea  
**Priority**: Low  
**Effort**: Medium  
**Description**: Predefined issue templates
- Bug report template
- Feature request template
- Task template
- Custom templates

**Value**: Consistency and speed in issue creation

**Implementation Notes**:
- Store templates in local storage
- Template format: JSON with field mappings
- Template management UI

---

### 10. Bulk Operations
**Status**: 💡 Idea  
**Priority**: Low  
**Effort**: High  
**Description**: Multi-issue operations
- Select multiple issues
- Bulk status change
- Bulk assignment
- Bulk labeling

**Value**: Efficiency for repetitive tasks

**Implementation Notes**:
- Checkbox selection in lists
- Confirmation dialog for bulk actions
- Progress indicator
- Error handling per issue

---

### 11. Recent Activity Feed
**Status**: 💡 Idea  
**Priority**: Low  
**Effort**: Medium  
**Description**: Activity stream
- Changes in assigned issues
- Mentions
- New comments
- Updates on watched issues

**Value**: Stay updated without email

**Implementation Notes**:
- API: `/rest/api/3/events` or activity stream
- Polling or webhook integration
- Notification integration

---

### ✅ 12. Time Tracking Reminders
**Status**: ✅ IMPLEMENTED
**Priority**: Low
**Effort**: Medium-High
**Description**: Smart time tracking alerts
- Active Issue Menu Bar command
- Visual alerts (Red icon) for long sessions
- User-configurable reminder interval

**Value**: Prevent forgotten time entries

---

## 🔧 Technical Improvements

### Performance Optimizations
- [ ] Implement caching for frequently accessed data
- [ ] Lazy loading for large lists
- [x] Debounce search inputs
- [ ] Optimize API calls

### Code Quality
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for API calls
- [x] Improve error handling and user feedback
- [x] Add TypeScript strict mode

### User Experience
- [ ] Add keyboard shortcuts documentation
- [ ] Improve loading states
- [x] Add empty states with helpful messages
- [x] Better error messages with actionable suggestions

---

## 📊 Status Legend

- ✅ **IMPLEMENTED**: Feature is complete and available
- 🚧 **IN PROGRESS**: Currently being developed
- 🔜 **PLANNED**: Scheduled for implementation
- 💡 **IDEA**: Concept stage, not yet planned
- ❌ **REJECTED**: Decided not to implement

---

## 🤝 Contributing

If you'd like to contribute to any of these features:

1. Check the status and implementation notes
2. Create a feature branch
3. Implement the feature following existing patterns
4. Update this document with status
5. Submit a pull request

---

**Last Updated**: 2025-12-07

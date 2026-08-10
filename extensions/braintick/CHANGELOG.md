# Braintick Changelog

## [1.1.0] - 2025-01-27

### ✨ New Features
- **Edit Timer Functionality** - Edit existing timer entries with full control over start/end times, project, task, description, and billable status
- **Enhanced Timer Management** - Edit timers directly from both the timers list and dashboard
- **Improved User Experience** - Added keyboard shortcut `⌘ E` for quick timer editing

### 🎨 UI/UX Improvements
- **Edit Timer Form** - Comprehensive form with project/task dropdowns, date pickers, and billable checkbox
- **Real-time Data Refresh** - Lists automatically update after timer edits
- **Consistent Actions** - Edit timer available in both timers list and dashboard recent timers

### ⚡ Quick Actions
- **New Keyboard Shortcut** - `⌘ E` for editing timers
- **Enhanced Action Panels** - Edit timer action added to timer items

### 🔧 Technical Improvements
- **Backend Integration** - Utilizes existing PUT /timers/:id API endpoint
- **Error Handling** - Comprehensive validation and error messages for timer editing
- **Type Safety** - Full TypeScript support for timer editing functionality

### 🐛 Bug Fixes
- Fixed circular dependency issues in useCallback hooks
- Resolved "Cannot access before initialization" runtime errors
- Improved function ordering and dependency management

## [1.0.0] - 2025-01-27

### ✨ Features
- **Dashboard Command** - Comprehensive overview of tasks, projects, and timers
- **Task Management** - Create, list, edit, and delete tasks with priorities and due dates
- **Project Management** - Create and manage color-coded projects
- **Time Tracking** - Start/stop timers for projects and tasks with billable hours
- **Authentication** - Secure login/logout with token storage
- **Huly Integration** - Sync tasks with Huly project management

### 🎨 UI/UX Enhancements
- **Advanced Search & Filtering** - Full-text search with status filters
- **Color-coded Priorities** - Visual indicators for task urgency (Red/Orange/Yellow/Blue)
- **Smart Due Date Indicators** - Color-coded due dates with overdue warnings
- **Project Tags** - Colored badges matching project themes
- **Real-time Statistics** - Live counts for active, completed, and overdue items
- **Smart Sorting** - Automatic prioritization by status, priority, and due dates

### ⚡ Quick Actions
- **Keyboard Shortcuts** - `⌘ N` (new task), `⌘ T` (start timer), `⌘ D` (details)
- **Context Actions** - Start timers directly from tasks
- **Organized Action Panels** - Grouped actions for better UX

### 🔧 Technical
- **TypeScript Types** - Complete type definitions from OpenAPI spec
- **Preferences** - Configurable API URL
- **Error Handling** - Comprehensive error messages and fallbacks
- **Performance** - Optimized rendering with memoized computations

### 📱 Commands
- `Dashboard` - Overview of productivity metrics
- `List Tasks` - View and manage all tasks
- `Create Task` - Add new tasks with full metadata
- `List Projects` - View all projects
- `Create Project` - Add new color-coded projects
- `List Timers` - View time tracking entries
- `Start Timer` - Begin tracking time
- `Login/Logout` - Authentication management

### 🐛 Bug Fixes
- Fixed task dropdown disappearing in timer form
- Resolved authentication token handling
- Improved form validation and error states

### 📝 Documentation
- Comprehensive README with features and usage
- Keyboard shortcuts documentation
- Installation and configuration guide

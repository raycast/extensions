# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for TaskMaster AI projects that provides visual Kanban boards, task management, and AI-powered project analysis. The extension reads from `.taskmaster/tasks/tasks.json` files and includes write capabilities for task creation and status updates. It integrates with [TaskMaster AI CLI](https://github.com/eyaltoledano/claude-task-master) for intelligent task management.

## Essential Commands

### Development Workflow
```bash
npm install          # Install dependencies
npm run dev          # Development mode with hot reload
npm run build        # Build the extension
npm run lint         # Code quality checks
npm run fix-lint     # Auto-fix linting issues
npm run publish      # Publish to Raycast Store
```

### Raycast CLI
```bash
ray develop          # Start development mode
ray build            # Build extension
ray lint             # Lint extension code
ray lint --fix       # Auto-fix linting issues
npx ray evals         # Run AI tool evaluations
```

## Architecture

### File Structure
```
src/
├── components/               # Reusable UI components
│   ├── TaskDetailView.tsx    # Task detail display component
│   ├── SubtaskListView.tsx   # Subtask list management
│   ├── SubtaskDetailView.tsx # Individual subtask details
│   └── DependencyListView.tsx # Task dependency visualization
├── hooks/useTaskMaster.ts    # Data fetching with @raycast/utils caching
├── lib/
│   ├── utils.ts              # Core filesystem utilities (read-only)
│   └── write-utils.ts        # Task update utilities (write operations)
├── tools/                    # AI Assistant integration tools
│   ├── analyze-project.ts    # Project analysis for AI
│   ├── get-task-info.ts      # Task information retrieval
│   ├── get-next-task.ts      # Next task recommendations
│   ├── list-commands.ts      # Available commands listing
│   └── generate-complexity-report.ts # Task complexity analysis
├── types/task.ts             # TypeScript interfaces
├── kanban-board.tsx          # Visual Kanban board command
├── task-list.tsx             # Chronological task view
├── search-tasks.tsx          # Advanced task search
├── next-task.tsx             # Smart task recommendations
├── task-detail.tsx           # Detailed task view with subtasks
├── project-status.tsx        # Comprehensive project dashboard
└── add-task.tsx              # Form-based task creation
```

### Core Design Patterns

**Data Flow**: Commands → React Hooks → Utilities → Direct file reading/writing from `.taskmaster/tasks.json`

**Caching Strategy**: Uses `@raycast/utils.useCachedPromise` for automatic caching with 30-second TTL

**Error Handling**: Graceful filesystem access with user-friendly error messages and fallback states

**Full-Featured Design**: Comprehensive read/write capabilities including task creation, status updates, and deletion through write-utils

**AI Integration**: Built-in AI assistant tools for project analysis, task recommendations, and complexity reporting

### Key Interfaces

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies?: string[];
  subtasks?: Subtask[];
}

interface TaskData {
  tasks: Task[];
  currentTag?: string;
  availableTags?: string[];
}
```

### TaskMaster Integration

The extension integrates with TaskMaster AI projects by:
- Reading/writing `.taskmaster/tasks/tasks.json` directly from the filesystem
- Supporting all TaskMaster task statuses: pending, in-progress, review, done, deferred, cancelled
- Managing task dependencies and subtask hierarchies
- Providing visual status organization (Kanban board) with status updates
- Smart next task recommendations based on dependencies and complexity
- Detailed task view with markdown formatting, subtask lists, and dependency tracking
- Form-based task creation with validation and dependency management
- Task deletion with dependency conflict detection

### Component Architecture

**Commands**: Main user-facing interfaces that implement Raycast command structure
**Components**: Reusable UI components for task details, subtasks, and dependency visualization
**Hooks**: Data management using `@raycast/utils` for caching and state management
**Utils**: Filesystem access functions for reading/writing TaskMaster data
**Tools**: AI Assistant integration tools for project analysis and recommendations
**Types**: Essential TypeScript definitions matching TaskMaster data structure

## Development Notes

### TypeScript Configuration
- Uses strict mode with ES2019 target
- React JSX with modern transform
- CommonJS modules for Node.js compatibility

### Raycast Integration
- Extension manifest in `package.json` defines 7 main commands and 5 AI tools
- User preferences for project configuration (project root, auto-refresh, display options)
- Uses `@raycast/api` components for UI consistency
- Keyboard shortcuts: Cmd+D for details, Cmd+B for Kanban, Cmd+L for list, Cmd+S for subtasks, Cmd+Shift+Backspace for delete task
- Built-in AI assistant with tools for project analysis and task management

### Performance Considerations
- Built-in caching via `@raycast/utils.useCachedPromise`
- Direct file reading without unnecessary abstractions
- Configurable concurrent request limits for file operations
- Error recovery and graceful degradation

### File Access Pattern
The extension reads/writes TaskMaster data using this pattern:

**Read Operations:**
1. Get project root from user preferences
2. Construct path to `.taskmaster/tasks/tasks.json`
3. Read and parse JSON with comprehensive error handling
4. Transform file format to internal interfaces
5. Cache results with automatic invalidation (30s TTL)

**Write Operations:**
1. Validate input data and dependencies
2. Create automatic backup of current data
3. Update task data with proper ID generation
4. Write to `.taskmaster/tasks/tasks.json` with error recovery
5. Invalidate cache and show success/error feedback via Toast notifications

### AI Assistant Integration

The extension includes built-in AI tools accessible via Raycast's AI assistant:

**Project Analysis Tools:**
- `analyze-project.ts`: Provides comprehensive project status analysis and insights
- `generate-complexity-report.ts`: Analyzes task complexity and suggests breakdowns
- `get-next-task.ts`: Smart recommendations based on dependencies and priority
- `get-task-info.ts`: Detailed task information retrieval
- `list-commands.ts`: Lists all available TaskMaster commands

**AI Tool Usage Pattern:**
1. User queries via Raycast AI assistant
2. Assistant selects appropriate tool based on query
3. Tool reads TaskMaster data and analyzes
4. Returns structured insights and recommendations

**Tool Configuration**: Defined in `package.json` under `tools` and `ai.evals` sections with comprehensive evaluations.

**AI Tool Best Practices Applied:**
- Enhanced parameter documentation with format specifications and discovery guidance
- Comprehensive error handling with helpful user guidance  
- Cross-tool workflow integration with smart recommendations
- Input validation with TaskMaster ID format checking (regex: `^[1-9]\d*(\.[1-9]\d*)*$`)
- Extension mentions required in all eval inputs: `@taskmaster-project-manager`

**Current Eval Performance:** 90% (5/7 passed) with advanced expectations including `includes`, `matches`, and `meetsCriteria` validations.

### Task Detail Features
The task detail system provides comprehensive task information with organized navigation:

#### **Main Task Detail View**
- **Markdown-formatted display** with sections for description, details, and dependencies
- **Subtask digest** showing progress summary and status breakdown
- **Navigation actions** to return to other views
- **Keyboard shortcuts** for quick access (Cmd+D from any task view)

#### **Subtask Management System**
- **Subtask List View** (Cmd+S): Organized view of all subtasks grouped by status
  - Progress overview with completion percentage
  - Individual subtask status indicators
  - Quick access to detailed subtask information
- **Individual Subtask Detail View**: Comprehensive subtask information
  - Parent task context and relationship
  - Subtask-specific dependencies
  - Detailed description and implementation notes
  - Navigation back to subtask list or parent task

#### **Navigation Flow**
```
Task Detail → View All Subtasks (Cmd+S) → Individual Subtask Detail (Cmd+D)
     ↑              ↑                            ↑
     └─────────── Back (Cmd+B) ←────────────────┘
```

## Component Development Patterns

### Reusable Components
- **TaskDetailView.tsx**: Handles task display with markdown rendering and action panels
- **SubtaskListView.tsx**: Groups subtasks by status with progress tracking
- **SubtaskDetailView.tsx**: Individual subtask details with parent task context
- **DependencyListView.tsx**: Visualizes task dependencies with status indicators

### Error Handling Strategy (Recently Refactored)
- **Toast Notifications**: User-friendly Toast messages instead of disruptive error screens
- **Graceful Degradation**: Components continue functioning with empty states when data unavailable  
- **Specific Error Context**: Actionable guidance instead of generic error messages
- **Fallback Options**: Clear next steps when TaskMaster projects are missing/invalid
- **Loading States**: Proper `isLoading` indicators on all List, Detail, Form, and Grid components
- **Backup System**: Automatic backups before write operations prevent data loss

### State Management
- Uses `@raycast/utils.useCachedPromise` for consistent caching
- 30-second cache TTL with manual revalidation options
- Optimistic updates for status changes with rollback on failure
- Separate hooks for different data access patterns (`useTasks`, `useNextTask`, `useTaskMaster`)

## Code Quality & Linting Standards

### Critical Linting Rules (Zero Tolerance)

**NEVER commit code with linting errors.** Always run `npm run fix-lint` before any file edits.

#### 1. TypeScript ESLint Errors
- **`@typescript-eslint/no-unused-vars`**: Only import types/variables that are actually used
  ```typescript
  // ❌ WRONG - Importing unused type
  import { TaskMasterSettings, TaskStatus } from "./types/task"; // TaskStatus not used
  
  // ✅ CORRECT - Only import what's used
  import { TaskMasterSettings } from "./types/task";
  ```

#### 2. Raycast-Specific Linting Rules
- **`@raycast/prefer-title-case`**: All action titles MUST use Title Case
  ```typescript
  // ❌ WRONG - Incorrect casing
  <Action.CopyToClipboard title="Task ID" />
  <Action.CopyToClipboard title="Task Name (with ID)" />
  
  // ✅ CORRECT - Proper Title Case
  <Action.CopyToClipboard title="Task Id" />
  <Action.CopyToClipboard title="Task Name (with Id)" />
  ```

#### 3. Prettier/Code Style Rules
- **File endings**: All files must end with a newline
- **Consistent formatting**: Let Prettier handle all formatting
- **Long lines**: Break appropriately for readability

### Pre-Implementation Checklist

Before writing ANY code, verify:

1. **Import Analysis**
   - [ ] Only import types/components that will be used
   - [ ] Remove any unused imports immediately
   - [ ] Use type-only imports when appropriate: `import type { SomeType }`

2. **Action Title Verification**
   - [ ] All `Action` titles use Title Case (e.g., "Next Task", "Copy to Clipboard")
   - [ ] Abbreviations follow Raycast conventions: "Id" not "ID", "Api" not "API"
   - [ ] Submenu titles follow same Title Case rules

3. **Code Style Standards**
   - [ ] Run `npm run fix-lint` before testing
   - [ ] Ensure file ends with newline
   - [ ] Check for any ESLint warnings in editor

### Common Linting Errors to Avoid

#### 1. Unused Import Errors
```typescript
// These specific errors occurred during development:

// ❌ Error: 'TaskStatus' is defined but never used
import { TaskMasterSettings, TaskStatus } from "./types/task";

// ✅ Fix: Remove unused import
import { TaskMasterSettings } from "./types/task";
```

#### 2. Title Case Violations
```typescript
// These specific errors occurred in Copy submenus:

// ❌ Violations found:
title: "Task ID"           // Should be "Task Id"
title: "Task Name (with ID)" // Should be "Task Name (with Id)"

// ✅ Correct format:
title: "Task Id"
title: "Task Name (with Id)"
title: "Copy to Clipboard"
title: "Next Task"
```

#### 3. File Formatting Issues
- Missing newlines at end of files (Prettier auto-fixes)
- Inconsistent indentation (Prettier auto-fixes)
- Long lines without proper breaks

### Development Workflow Integration

#### Before Starting Any Feature
1. Understand the linting rules for the file type
2. Set up editor to show ESLint warnings/errors
3. Configure auto-fix on save if possible

#### During Development
1. Check editor for linting warnings constantly
2. Fix issues immediately, don't accumulate
3. Run `npm run lint` periodically during development

#### Before Committing
1. **MANDATORY**: Run `npm run fix-lint`
2. **VERIFY**: Run `npm run lint` shows no errors
3. **CHECK**: All imports are used
4. **CONFIRM**: All action titles use Title Case

### Editor Configuration Recommendations

For optimal development experience:
- Enable ESLint extension with auto-fix on save
- Enable Prettier extension for consistent formatting
- Show ESLint warnings/errors inline
- Configure TypeScript strict mode checking

### Zero-Tolerance Policy

**Any code that fails linting MUST be fixed before proceeding.** This includes:
- Unused imports (even if "harmless")
- Title case violations (breaks Raycast conventions)
- Any TypeScript errors or warnings
- Prettier formatting issues

This ensures consistent, high-quality code that follows Raycast's standards and maintains the extension's professional quality.
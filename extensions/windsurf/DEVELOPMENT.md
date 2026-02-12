# Windsurf Raycast Extension - Development Guide

## Setup & Installation

### Prerequisites
- Node.js 18+
- macOS 11+
- Windsurf installed (or available in PATH)
- Raycast 1.83+

### Initial Setup

```bash
# Clone or navigate to the extension directory
cd ~/raycast-windsurf-extension

# Install dependencies
npm install

# Start development mode
npm run dev
```

This will:
1. Start the TypeScript compiler in watch mode
2. Open Raycast in development mode
3. Allow you to test the extension immediately

## Testing

### Unit Tests
No unit tests are currently configured, but you can add them using Jest:

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Manual Testing Checklist

#### 1. Search Recent Projects Command
- [ ] Command loads without errors
- [ ] Recent projects list displays correctly
- [ ] Search/filter works by project name
- [ ] Type filter dropdown works (All Types, Folders, Files, Workspaces)
- [ ] Pinned projects section appears
- [ ] Projects open when selected
- [ ] Git branch tags show (if enabled in preferences)

#### 2. Open with Windsurf Command
- [ ] Select file/folder in Finder
- [ ] Run "Open with Windsurf" command
- [ ] File/folder opens in Windsurf

#### 3. Open New Window Command
- [ ] Run "Open New Window" command
- [ ] New Windsurf window opens

#### 4. Pin/Unpin Functionality
- [ ] Can pin entries from recent projects
- [ ] Pinned entries appear in "Pinned Projects" section
- [ ] Can move pinned entries up/down (if in List mode)
- [ ] Can unpin individual entries
- [ ] Can unpin all entries at once
- [ ] Pinned entries persist between launches

#### 5. Project Removal
- [ ] Can remove individual recent projects
- [ ] Can remove all recent projects (with confirmation)
- [ ] Removed projects no longer appear in list

#### 6. Keyboard Shortcuts
- [ ] `Cmd + O` - Open with system app
- [ ] `Cmd + Shift + O` - Open with terminal (folders only)
- [ ] `Cmd + .` - Copy project name
- [ ] `Cmd + Shift + .` - Copy project path
- [ ] `Cmd + Shift + P` - Toggle pin
- [ ] `Cmd + Opt + ↑/↓` - Move pinned entry
- [ ] `Ctrl + X` - Remove project
- [ ] `Ctrl + Shift + X` - Remove all projects

#### 7. Git Integration
- [ ] Disable "Show Git Branch" and verify no branches show
- [ ] Enable "Show Git Branch" and verify branches show for repos
- [ ] Custom branch color works
- [ ] Invalid color codes are ignored

#### 8. Preferences
- [ ] List/Grid layout toggle works
- [ ] Terminal app picker works
- [ ] All settings persist between launches

## Windsurf Database Investigation

### Finding the Database

```bash
# Check for Windsurf data directory
ls -la ~/.windsurf/
ls -la ~/Library/Application\ Support/Windsurf/

# Look for the database file
find ~/.windsurf -name "state.vscdb" -o -name "state.db" -o -name "*.db"

# Inspect the database schema
sqlite3 ~/.windsurf/User/globalStorage/state.vscdb ".schema"

# Query recent entries
sqlite3 ~/.windsurf/User/globalStorage/state.vscdb \
  "SELECT key, value FROM ItemTable WHERE key LIKE '%history%' OR key LIKE '%recent%';"
```

### Database Schema Discovery

If the database exists, you can:

```bash
# List all tables
sqlite3 ~/.windsurf/User/globalStorage/state.vscdb ".tables"

# Examine ItemTable structure
sqlite3 ~/.windsurf/User/globalStorage/state.vscdb ".schema ItemTable"

# Look at recent entries
sqlite3 ~/.windsurf/User/globalStorage/state.vscdb \
  "SELECT json_extract(value, '$.entries') FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList';"
```

## Debugging

### Enable Debug Logging

Add console logs in critical functions:

```typescript
// In database.ts
console.log('Windsurf DB path:', path);
console.log('Parsed entries:', parsedEntries);

// In windsurf.ts
console.log('Opening project:', projectPath);
console.log('Using method:', 'URL scheme' | 'CLI' | 'open -a');
```

View logs in Raycast development console.

### Common Issues & Solutions

#### Issue: "Failed to load recent projects"
**Causes:**
- Windsurf not installed
- Database file not found at expected paths
- Database schema different from expected

**Solutions:**
1. Verify Windsurf installation: `which windsurf` or check `/Applications/`
2. Check database existence: `ls -la ~/.windsurf/User/globalStorage/`
3. Inspect database keys: `sqlite3 state.vscdb "SELECT key FROM ItemTable LIMIT 10;"`
4. Update database path in `constants.ts` if needed

#### Issue: "Make sure Windsurf is installed"
**Causes:**
- Windsurf not in PATH
- App not at expected locations
- Not installed correctly

**Solutions:**
1. Try `open -a Windsurf` to test
2. If not found, add to PATH or update `windsurf.ts`
3. Check `/Applications/Windsurf.app/` exists

#### Issue: Projects won't open
**Causes:**
- URL scheme not supported
- CLI not in PATH
- Permission issues

**Solutions:**
1. Check `windsurf.ts` fallback chain
2. Verify each method manually:
   - `windsurf ~/path/to/project`
   - `open -a Windsurf ~/path/to/project`
3. Check file permissions

## Code Structure Notes

### Database Module (`database.ts`)
- Uses `useSQL` hook from `@raycast/utils` for SQLite queries
- Queries `history.recentlyOpenedPathsList` from ItemTable
- Handles database path discovery
- Provides entry management (add, remove, etc.)

### Project Opening (`windsurf.ts`)
- Implements fallback chain: URL scheme → CLI → `open -a`
- Each method is wrapped in try-catch
- Proper error handling and user feedback

### UI Components
- **index.tsx**: Main command with search and filtering
- **grid-or-list.tsx**: Adaptive UI based on user preference
- **pinned.ts**: Local storage management for pinned entries

### Type System
- Follows VS Code's entry types (Workspace, Folder, File, Remote)
- Type guards for safe type narrowing
- Extensible for future entry types

## Building & Publishing

### Build Extension
```bash
npm run build
```

Output goes to `dist/` directory.

### Publish to Raycast Store
```bash
npm run publish
```

This requires:
1. Raycast CLI installed
2. Account authentication
3. Valid manifest metadata

## Environment Variables

Currently none required, but you can add:

```typescript
// In constants.ts
const WINDSURF_CLI_PATH = process.env.WINDSURF_CLI_PATH || 'windsurf';
```

## Continuous Improvement

### Potential Enhancements
1. [ ] Codeium integration
2. [ ] Custom project grouping/tagging
3. [ ] Quick action commands (restart, settings)
4. [ ] Project favorites with custom sorting
5. [ ] Integration with VS Code extension explorer
6. [ ] Shell command wrapper for better integration
7. [ ] Workspace recommendations
8. [ ] Recent file quick access

### Known Limitations
1. Database paths need to be discovered dynamically
2. No support for removing entries from Windsurf's perspective (only Raycast)
3. Remote entry handling may vary by Windsurf version
4. Git branch detection adds latency to list rendering

## Performance Optimization

### Current Approach
- SQLite queries are efficient
- Git branch detection is lazy and memoized per session
- Pinned entries stored in local storage (minimal overhead)

### Future Optimizations
- Cache git branches with TTL
- Lazy load git info on-demand
- Implement virtual scrolling for large project lists

## Security Considerations

- Database access is read-only through SQL queries
- Pinned entries stored locally in Raycast storage
- No external API calls (offline-first)
- File paths are properly escaped before executing commands

# Query Tabs Command

## Overview

The Query Tabs command provides a fast, searchable interface for all your Kitty terminal tabs. Unlike the List Tabs command which groups tabs by window, Query Tabs presents all tabs in a single searchable list with intelligent filtering and sorting.

## Features

### Search
- **Real-time filtering** as you type
- **Matches against:**
  - Tab title
  - Current working directory
  - Foreground process name
- **Case-insensitive** search
- **Partial match** support

### Sorting
- **Active tabs appear first** - quickly access your current work
- **Alphabetical by title** within each group (active/inactive)
- **Consistent ordering** for easy navigation

### Performance
- **Efficient filtering** using pre-sorted data
- **Minimal re-renders** with optimized React patterns
- **Fast search** even with large numbers of tabs (50+)

### Keyboard Shortcuts
- **`Cmd+K`**: Refresh tab list
- **`Cmd+Enter`**: Focus the first result in the filtered list
- **`Enter`**: Activate the selected tab
- **`↑/↓`**: Navigate between results

### Actions
- **Focus Tab**: Switch to the selected tab
- **Copy Directory**: Copy the tab's working directory to clipboard
- **Copy Title**: Copy the tab's title to clipboard
- **Refresh**: Reload all tabs from Kitty

## Usage

### Basic Usage

1. Press `Cmd+K` in Raycast
2. Type `kitty query`
3. Start typing to filter tabs
4. Press `Enter` to activate the selected tab
5. Press `Cmd+Enter` to quickly focus the first result

### Search Examples

#### Find tabs by project name
```
Type: "project-alpha"
Matches: "Alpha Project - VS Code", "project-alpha-backend"
```

#### Find tabs by directory
```
Type: "/home/user/projects"
Matches: All tabs with that directory path
```

#### Find tabs by process
```
Type: "vim"
Matches: "Editing config.txt (vim)", "main.py (vim)"
```

#### Combine searches
```
Type: "python api"
Matches: "Python API Server" in /home/api directory
```

## Technical Details

### Implementation

The Query Tabs command is implemented in:
- `src/commands/queryTabs.tsx` - Main command component
- `src/utils/filtering.ts` - Filtering and sorting logic
- `src/utils/kittyAPI.ts` - Kitty API integration

### Filtering Algorithm

```typescript
// Pseudocode for filtering logic
const filterAndSortTabs = (tabs, query) => {
  // 1. Filter by query (case-insensitive)
  let filtered = tabs.filter(tab =>
    tab.title.includes(query) ||
    tab.workingDirectory.includes(query) ||
    tab.foregroundProcessName?.includes(query)
  )

  // 2. Sort: active first, then alphabetically
  return filtered.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.title.localeCompare(b.title)
  })
}
```

### API Integration

Uses the same Kitty API as List Tabs:
- `kitty @ ls` - Get all tabs across instances
- `kitty @ focus-window --match id:<id>` - Activate specific tab

### Caching

The Query Tabs command benefits from the existing caching strategy:
- Tab lists cached for 1 second
- Reduces API calls to Kitty
- Improves performance on slower systems

### Error Handling

- **Graceful degradation** if Kitty is unavailable
- **User-friendly error messages** for common issues
- **Automatic retry** on temporary failures

## Comparison with List Tabs

| Feature | List Tabs | Query Tabs |
|---------|-----------|------------|
| **Display** | Grouped by window | Flat list |
| **Search** | No | Yes (real-time) |
| **Sorting** | By window | By active status + alphabetical |
| **Best for** | Window management | Quick tab discovery |
| **Keyboard nav** | Arrow keys | Arrow keys + Cmd+Enter |
| **Use case** | Working within windows | Finding specific tabs |

## Examples

### Scenario 1: Finding a specific tab
You have 20 tabs open across 5 windows and need to find the "server.py" tab.

**With List Tabs:** Navigate through 5 window groups manually
**With Query Tabs:** Type "server.py" and find it instantly

### Scenario 2: Switching to active work
You're in a different app and need to get back to your active terminal tab.

**With List Tabs:** Navigate to the window, find the active tab
**With Query Tabs:** The active tab is already at the top

### Scenario 3: Finding tabs by directory
You need to find all tabs in a specific project directory.

**With List Tabs:** Navigate through windows, check each tab
**With Query Tabs:** Type the directory path, all matching tabs appear

## Best Practices

1. **Use descriptive tab titles** - Makes search more effective
2. **Use Cmd+Enter** for quick access to the first result
3. **Combine search terms** - Type multiple keywords for precise matching
4. **Refresh with Cmd+K** if you just opened/closed tabs
5. **Copy directories** with Cmd+Shift+C for quick navigation in terminal

## Troubleshooting

### Search is slow
- Check the number of open tabs (performance degrades with 100+ tabs)
- Ensure Kitty is responding normally
- Try refreshing with Cmd+K

### No results found
- Verify tabs are actually open in Kitty
- Try a broader search term
- Check spelling and case (search is case-insensitive but exact match helps)

### Active tab not at top
- This is expected if no tab is actually active
- An active tab has a running process in the foreground
- Tabs with just a shell prompt are not considered "active"

## Future Enhancements

Potential improvements for future versions:
- **Regex search** for advanced pattern matching
- **Fuzzy matching** for typo tolerance
- **Search history** for frequently used queries
- **Custom sort options** (by directory, process, etc.)
- **Recent tabs** quick access
- **Tag-based organization** for tabs

## Contributing

The Query Tabs command is part of the main raycast-kitty-tabs extension. To contribute:

1. Edit `src/commands/queryTabs.tsx` for UI changes
2. Edit `src/utils/filtering.ts` for search logic
3. Add tests in `test/` directory
4. Update documentation

See the main README.md for development guidelines.

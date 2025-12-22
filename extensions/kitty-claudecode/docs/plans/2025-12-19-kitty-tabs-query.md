# Kitty Tabs Query Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new Raycast command to query and display all Kitty terminal tabs with enhanced search and filtering capabilities

**Architecture:** Create a new command component `queryTabs.tsx` that leverages the existing Kitty API utilities (`kittyAPI.ts`) to fetch and display tabs in an optimized List view with real-time search and filtering

**Tech Stack:** TypeScript, React, @raycast/api, @raycast/utils

---

## Task 1: Create Query Tabs Command Component

**Files:**
- Create: `src/commands/queryTabs.tsx`
- Create: `src/components/QueryTabList.tsx`
- Test: `test/query-tabs.test.tsx`

**Step 1: Write the failing test**

```typescript
// test/query-tabs.test.tsx
import { render, waitFor } from '@testing-library/react';
import QueryTabs from '../src/commands/queryTabs';
import { listKittyTabs } from '../src/utils/kittyAPI';

jest.mock('../src/utils/kittyAPI');

describe('QueryTabs', () => {
  it('should display loading state initially', async () => {
    const mockListKittyTabs = listKittyTabs as jest.Mock;
    mockListKittyTabs.mockResolvedValue([]);

    render(<QueryTabs />);

    // Check for loading indicator
    expect(document.querySelector('[data-testid="loading"]')).toBeInTheDocument();
  });

  it('should display all tabs after loading', async () => {
    const mockTabs = [
      {
        id: 1,
        title: 'Terminal 1',
        cwd: '/home/user',
        pid: 1234,
        windowId: 1,
        isActive: false,
        foregroundProcessName: 'bash'
      }
    ];

    const mockListKittyTabs = listKittyTabs as jest.Mock;
    mockListKittyTabs.mockResolvedValue(mockTabs);

    render(<QueryTabs />);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="tab-item"]')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/query-tabs.test.tsx`
Expected: FAIL with "Cannot find module '../src/commands/queryTabs'"

**Step 3: Create basic command structure**

```typescript
// src/commands/queryTabs.tsx
import { Action, ActionPanel, List } from '@raycast/api';
import { useState, useEffect } from 'react';
import { listKittyTabs } from '../utils/kittyAPI';
import { KittyTab } from '../types';

export default function QueryTabs() {
  const [tabs, setTabs] = useState<KittyTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    setIsLoading(true);
    try {
      const allTabs = await listKittyTabs();
      setTabs(allTabs);
    } catch (error) {
      console.error('Failed to load tabs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchText.toLowerCase()) ||
    tab.cwd.toLowerCase().includes(searchText.toLowerCase()) ||
    tab.foregroundProcessName?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs by title, directory, or process..."
    >
      {filteredTabs.map((tab) => (
        <List.Item
          key={`${tab.windowId}-${tab.id}`}
          title={tab.title}
          subtitle={tab.cwd}
          icon="🗂️"
          actions={
            <ActionPanel>
              <Action title="Focus Tab" onAction={() => focusTab(tab.windowId)} />
              <Action.CopyToClipboard title="Copy Directory" content={tab.cwd} />
              <Action.CopyToClipboard title="Copy Title" content={tab.title} />
              <Action title="Refresh" onAction={loadTabs} shortcut={{ modifiers: ['cmd'], key: 'k' }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function focusTab(windowId: number) {
  // Implementation in next task
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/query-tabs.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/queryTabs.tsx test/query-tabs.test.tsx
git commit -m "feat: create basic query tabs command component"
```

---

## Task 2: Implement Focus Tab Functionality

**Files:**
- Modify: `src/commands/queryTabs.tsx:50-55`
- Test: `test/focus-tab.test.ts`

**Step 1: Write the failing test**

```typescript
// test/focus-tab.test.ts
import { focusTab } from '../src/utils/kittyAPI';

jest.mock('../src/utils/kittyAPI');

describe('focusTab', () => {
  it('should focus tab with given windowId', async () => {
    const mockFocusTab = focusTab as jest.Mock;
    mockFocusTab.mockResolvedValue(undefined);

    await focusTab(42);

    expect(mockFocusTab).toHaveBeenCalledWith(42);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/focus-tab.test.ts`
Expected: FAIL with "focusTab is not a function"

**Step 3: Add focusTab to kittyAPI**

```typescript
// src/utils/kittyAPI.ts (add to existing file)
export const focusTab = async (windowId: number): Promise<void> => {
  try {
    await execFileAsync('kitty', ['@', 'focus-window', '--match', `id:${windowId}`], {
      timeout: 5000,
    });
  } catch (error) {
    throw new Error(
      `Failed to focus tab (window ${windowId}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
```

**Step 4: Update queryTabs.tsx to use focusTab**

```typescript
// src/commands/queryTabs.tsx (replace focusTab function)
import { focusTab } from '../utils/kittyAPI';

async function focusTabAction(windowId: number) {
  try {
    await focusTab(windowId);
  } catch (error) {
    console.error('Failed to focus tab:', error);
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- test/focus-tab.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/kittyAPI.ts src/commands/queryTabs.tsx test/focus-tab.test.ts
git commit -m "feat: implement focus tab functionality"
```

---

## Task 3: Add Command Metadata and Registration

**Files:**
- Modify: `src/index.tsx`
- Test: `test/command-registration.test.ts`

**Step 1: Write the failing test**

```typescript
// test/command-registration.test.ts
import { commands } from '../src/index';

describe('Command Registration', () => {
  it('should register queryTabs command', () => {
    expect(commands).toContainEqual(
      expect.objectContaining({
        name: 'query-tabs',
        title: 'Query Kitty Tabs'
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/command-registration.test.ts`
Expected: FAIL with "query-tabs command not found"

**Step 3: Update index.tsx to register new command**

```typescript
// src/index.tsx (add to existing imports and exports)
import QueryTabs from './commands/queryTabs';

export const commands = [
  {
    name: 'list-tabs',
    title: 'List Kitty Tabs',
    component: ListTabs,
  },
  {
    name: 'query-tabs',
    title: 'Query Kitty Tabs',
    component: QueryTabs,
  },
];
```

**Step 4: Update package.json with new command**

```json
// package.json (add to existing commands array)
{
  "commands": [
    {
      "name": "list-tabs",
      "title": "List Kitty Tabs",
      "description": "List all Kitty terminal tabs"
    },
    {
      "name": "query-tabs",
      "title": "Query Kitty Tabs",
      "description": "Query and search all Kitty terminal tabs"
    }
  ]
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- test/command-registration.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/index.tsx package.json test/command-registration.test.ts
git commit -m "feat: register query-tabs command"
```

---

## Task 4: Add Enhanced Filtering and Sorting

**Files:**
- Modify: `src/components/QueryTabList.tsx`
- Test: `test/filtering-sorting.test.ts`

**Step 1: Write the failing test**

```typescript
// test/filtering-sorting.test.ts
import { filterAndSortTabs } from '../src/utils/filtering';

describe('Filtering and Sorting', () => {
  it('should filter tabs by search query', () => {
    const tabs = [
      { id: 1, title: 'Terminal 1', cwd: '/home/user', pid: 1234, windowId: 1, isActive: false },
      { id: 2, title: 'Terminal 2', cwd: '/home/projects', pid: 5678, windowId: 1, isActive: false }
    ];

    const filtered = filterAndSortTabs(tabs, 'Terminal 1');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Terminal 1');
  });

  it('should sort tabs by active status', () => {
    const tabs = [
      { id: 1, title: 'Inactive', cwd: '/home', pid: 1234, windowId: 1, isActive: false },
      { id: 2, title: 'Active', cwd: '/home', pid: 5678, windowId: 1, isActive: true }
    ];

    const sorted = filterAndSortTabs(tabs, '');

    expect(sorted[0].isActive).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/filtering-sorting.test.ts`
Expected: FAIL with "filterAndSortTabs is not a function"

**Step 3: Create filtering utility**

```typescript
// src/utils/filtering.ts
import { KittyTab } from '../types';

export const filterAndSortTabs = (tabs: KittyTab[], query: string): KittyTab[] => {
  let filtered = tabs;

  // Filter by query
  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    filtered = tabs.filter(tab =>
      tab.title.toLowerCase().includes(lowerQuery) ||
      tab.cwd.toLowerCase().includes(lowerQuery) ||
      tab.foregroundProcessName?.toLowerCase().includes(lowerQuery)
    );
  }

  // Sort: active first, then by title
  return filtered.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.title.localeCompare(b.title);
  });
};
```

**Step 4: Update QueryTabList to use filtering**

```typescript
// src/components/QueryTabList.tsx
import { filterAndSortTabs } from '../utils/filtering';

export function QueryTabList({ tabs, isLoading }: { tabs: KittyTab[]; isLoading: boolean }) {
  const [searchText, setSearchText] = useState('');
  const filteredTabs = useMemo(() => filterAndSortTabs(tabs, searchText), [tabs, searchText]);

  // ... render logic
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- test/filtering-sorting.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/filtering.ts src/components/QueryTabList.tsx test/filtering-sorting.test.ts
git commit -m "feat: add enhanced filtering and sorting"
```

---

## Task 5: Add Keyboard Shortcuts and User Experience

**Files:**
- Modify: `src/commands/queryTabs.tsx`
- Test: `test/keyboard-shortcuts.test.ts`

**Step 1: Write the failing test**

```typescript
// test/keyboard-shortcuts.test.ts
import { fireEvent } from '@testing-library/react';
import QueryTabs from '../src/commands/queryTabs';

describe('Keyboard Shortcuts', () => {
  it('should refresh on Cmd+K', async () => {
    render(<QueryTabs />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    // Check if refresh was triggered
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/keyboard-shortcuts.test.ts`
Expected: FAIL with shortcuts not implemented

**Step 3: Add keyboard shortcuts to queryTabs**

```typescript
// src/commands/queryTabs.tsx (add to component)
import { useHotkeys } from '@raycast/utils';

export default function QueryTabs() {
  // ... existing code

  useHotkeys([
    {
      key: 'cmd.k',
      onAction: loadTabs,
    },
    {
      key: 'cmd.enter',
      onAction: () => {
        if (filteredTabs[0]) {
          focusTabAction(filteredTabs[0].windowId);
        }
      },
    },
  ]);

  // ... rest of component
}
```

**Step 4: Add action shortcuts in ActionPanel**

```typescript
// src/commands/queryTabs.tsx (in List.Item actions)
<Action title="Focus Tab" onAction={() => focusTabAction(tab.windowId)} shortcut={{ modifiers: ['cmd'], key: 'enter' }} />
<Action title="Refresh" onAction={loadTabs} shortcut={{ modifiers: ['cmd'], key: 'k' }} />
```

**Step 5: Run test to verify it passes**

Run: `npm test -- test/keyboard-shortcuts.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/commands/queryTabs.tsx test/keyboard-shortcuts.test.ts
git commit -m "feat: add keyboard shortcuts and UX improvements"
```

---

## Task 6: Integration Testing and Build Verification

**Files:**
- Test: `test/integration/query-tabs.integration.test.ts`
- Run: `npm run build`

**Step 1: Write integration test**

```typescript
// test/integration/query-tabs.integration.test.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Query Tabs Integration', () => {
  it('should compile successfully', () => {
    try {
      execSync('npm run build', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Build failed');
    }
  });

  it('should have queryTabs command in dist', () => {
    const distPath = path.join(__dirname, '../../dist/index.js');
    const content = fs.readFileSync(distPath, 'utf8');

    expect(content).toContain('query-tabs');
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- test/integration/query-tabs.integration.test.ts`
Expected: Build succeeds, command is in dist

**Step 3: Run full build**

Run: `npm run build`
Expected: No errors, dist/ directory created

**Step 4: Run linting**

Run: `npm run lint`
Expected: No linting errors

**Step 5: Run formatting**

Run: `npm run format`
Expected: Code formatted correctly

**Step 6: Commit**

```bash
git add test/integration/query-tabs.integration.test.ts
git commit -m "test: add integration tests for query-tabs command"
```

---

## Task 7: Documentation Update

**Files:**
- Modify: `README.md`
- Create: `docs/QUERY_TABS.md`

**Step 1: Update README.md**

```markdown
## Commands

### List Kitty Tabs
Lists all Kitty terminal tabs grouped by window.

**Shortcut:** `kitty list`

### Query Kitty Tabs
Query and search all Kitty terminal tabs with real-time filtering.

**Features:**
- Search by title, directory, or process name
- Sort by active status
- Keyboard shortcuts (Cmd+K to refresh, Cmd+Enter to focus first result)
- Quick actions for copying and focusing tabs

**Shortcut:** `kitty query`
```

**Step 2: Create detailed documentation**

```markdown
# Query Tabs Command

## Overview
The Query Tabs command provides a fast, searchable interface for all your Kitty terminal tabs.

## Features

### Search
- Real-time filtering as you type
- Matches against:
  - Tab title
  - Current working directory
  - Foreground process name

### Sorting
- Active tabs appear first
- Alphabetical by title within each group

### Actions
- **Focus Tab (Cmd+Enter)**: Switch to the selected tab
- **Copy Directory**: Copy the tab's working directory to clipboard
- **Copy Title**: Copy the tab's title to clipboard
- **Refresh (Cmd+K)**: Reload all tabs from Kitty

## Usage
1. Press `Cmd+K` in Raycast
2. Type `kitty query`
3. Start typing to filter tabs
4. Press `Cmd+Enter` to focus the first result, or select a specific tab
```

**Step 3: Commit**

```bash
git add README.md docs/QUERY_TABS.md
git commit -m "docs: document query-tabs command"
```

---

## Task 8: Final Testing and Validation

**Files:**
- Test: Manual testing with Raycast
- Run: `npm run dev`

**Step 1: Start development server**

Run: `npm run dev`
Expected: Extension builds and installs to Raycast

**Step 2: Test in Raycast**

1. Open Raycast
2. Search for "kitty query"
3. Verify tabs are listed
4. Test search functionality
5. Test keyboard shortcuts
6. Test focus action

**Step 3: Test error handling**

1. Close all Kitty windows
2. Run query-tabs command
3. Verify appropriate error message

**Step 4: Test performance**

1. Open many tabs in Kitty (20+)
2. Run query-tabs command
3. Verify search is responsive

**Step 5: Commit**

```bash
git commit -m "chore: complete query-tabs command implementation"
```

---

**Plan complete and saved to `docs/plans/2025-12-19-kitty-tabs-query.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

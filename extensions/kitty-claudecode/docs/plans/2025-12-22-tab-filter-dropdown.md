# Tab Filter Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dropdown filter to listTabs command to switch between "All Tabs" and "Claude Code" tabs.

**Architecture:** Extend KittyTab type with `isClaudeSession` flag, detect Claude by checking `foreground_processes[].cmdline` for "claude" string, add Dropdown to TabList using Raycast's `searchBarAccessory`.

**Tech Stack:** TypeScript, React, Raycast API (`List.Dropdown`)

---

## Task 1: Extend KittyTab Type

**Files:**
- Modify: `src/types/index.ts:5-15`

**Step 1: Add isClaudeSession field to KittyTab interface**

```typescript
export interface KittyTab {
  id: number
  windowPaneId?: number
  title: string
  workingDirectory: string
  pid: number
  windowId: number
  isActive: boolean
  foregroundProcessName?: string
  color?: string
  isClaudeSession?: boolean  // NEW: whether this tab is running Claude Code
}
```

**Step 2: Run typecheck to verify no breaking changes**

Run: `npm run typecheck`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add isClaudeSession field to KittyTab"
```

---

## Task 2: Detect Claude Sessions in Parser

**Files:**
- Modify: `src/utils/kittyAPI.ts:140-160`

**Step 1: Update parseKittyListOutput to detect Claude sessions**

In the `parseKittyListOutput` function, locate the loop that creates `tabObj` (around line 144-156). Replace with:

```typescript
            // Check if any foreground process is Claude Code
            const isClaudeSession = windowPane.foreground_processes?.some(
              (proc: { cmdline?: string[] }) =>
                proc.cmdline?.some((arg: string) => arg.includes('claude'))
            ) ?? false

            const tabObj: KittyTab = {
              id: tab.id,
              windowPaneId: windowPane.id,
              title: windowPane.title || tab.title || 'Untitled',
              workingDirectory: windowPane.cwd || '',
              pid: windowPane.pid,
              windowId: window.id,
              isActive: windowPane.is_active || false,
              foregroundProcessName: windowPane.foreground_processes?.[0]?.cmdline?.[0],
              color: kittyCache.getTabColor(tab.id),
              isClaudeSession,  // NEW
            }
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/kittyAPI.ts
git commit -m "feat(api): detect Claude Code sessions in foreground_processes"
```

---

## Task 3: Add Filter State to ListTabs Command

**Files:**
- Modify: `src/commands/listTabs.tsx:17-24` (state section)
- Modify: `src/commands/listTabs.tsx:201-214` (filteredTabs useMemo)

**Step 1: Add filter type and state**

At the top of the file (after imports, before the component), add the type:

```typescript
type TabFilterType = 'all' | 'claude'
```

Inside the `ListTabs` component, add state after line 23:

```typescript
  const [filter, setFilter] = useState<TabFilterType>('all')
```

**Step 2: Update filteredTabs useMemo to include filter logic**

Replace the existing `filteredTabs` useMemo (lines 202-214) with:

```typescript
  // Filter tabs based on filter type and search text
  const filteredTabs = useMemo(() => {
    let result = tabs

    // Filter by type (All or Claude)
    if (filter === 'claude') {
      result = result.filter(tab => tab.isClaudeSession)
    }

    // Filter by search text
    if (searchText.trim()) {
      const query = searchText.toLowerCase()
      result = result.filter(
        tab =>
          tab.title.toLowerCase().includes(query) ||
          tab.workingDirectory.toLowerCase().includes(query) ||
          tab.foregroundProcessName?.toLowerCase().includes(query)
      )
    }

    return result
  }, [tabs, filter, searchText])
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/commands/listTabs.tsx
git commit -m "feat(listTabs): add filter state for All/Claude tabs"
```

---

## Task 4: Update TabList Props and Add Dropdown

**Files:**
- Modify: `src/components/TabList.tsx:9-15` (props interface)
- Modify: `src/components/TabList.tsx:17-23` (function signature)
- Modify: `src/components/TabList.tsx:100-102` (List component)

**Step 1: Update TabListProps interface**

Replace the interface (lines 9-15) with:

```typescript
type TabFilterType = 'all' | 'claude'

interface TabListProps {
  tabs: KittyTab[]
  isLoading: boolean
  onActivate: () => void
  onRename?: (tabId: number) => void
  onSetColor?: (tabId: number) => void
  filter: TabFilterType
  onFilterChange: (value: TabFilterType) => void
}
```

**Step 2: Update function signature to destructure new props**

Replace the function signature (lines 17-23) with:

```typescript
export default function TabList({
  tabs,
  isLoading,
  onActivate,
  onRename,
  onSetColor,
  filter,
  onFilterChange,
}: TabListProps) {
```

**Step 3: Add searchBarAccessory to List component**

Replace the List opening tag (around line 101-102) with:

```typescript
    // @ts-expect-error - Raycast API type compatibility with React 18
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs..."
      searchBarAccessory={
        // @ts-expect-error - Raycast API type compatibility with React 18
        <List.Dropdown
          tooltip="Filter Tabs"
          value={filter}
          onChange={(newValue) => onFilterChange(newValue as TabFilterType)}
        >
          {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
          <List.Dropdown.Item title="All Tabs" value="all" />
          {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
          <List.Dropdown.Item title="Claude Code" value="claude" />
        </List.Dropdown>
      }
    >
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL (TabList props mismatch in listTabs.tsx)

**Step 5: Commit TabList changes**

```bash
git add src/components/TabList.tsx
git commit -m "feat(TabList): add filter dropdown UI"
```

---

## Task 5: Connect Filter Props in ListTabs

**Files:**
- Modify: `src/commands/listTabs.tsx:280-288` (TabList usage)

**Step 1: Update TabList usage to pass filter props**

Replace the TabList component call (around lines 281-288) with:

```typescript
    <TabList
      tabs={filteredTabs}
      isLoading={isLoading}
      onActivate={handleActivate}
      onRename={(tabId: number) => setRenamingTabId(tabId)}
      onSetColor={(tabId: number) => setSettingColorTabId(tabId)}
      filter={filter}
      onFilterChange={setFilter}
    />
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS (or only warnings)

**Step 5: Commit**

```bash
git add src/commands/listTabs.tsx
git commit -m "feat(listTabs): connect filter dropdown to TabList"
```

---

## Task 6: Manual Testing

**Step 1: Start development mode**

Run: `npm run dev`

**Step 2: Test in Raycast**

1. Open Raycast, run "Kitty Tabs" command
2. Verify dropdown appears next to search bar
3. Verify "All Tabs" is selected by default
4. Switch to "Claude Code" - verify only tabs with Claude sessions appear
5. Switch back to "All Tabs" - verify all tabs appear
6. Test search still works with filter applied

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final adjustments after manual testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add `isClaudeSession` to KittyTab type | `src/types/index.ts` |
| 2 | Detect Claude in parser | `src/utils/kittyAPI.ts` |
| 3 | Add filter state | `src/commands/listTabs.tsx` |
| 4 | Add Dropdown UI | `src/components/TabList.tsx` |
| 5 | Connect props | `src/commands/listTabs.tsx` |
| 6 | Manual testing | - |

**Total: 6 tasks, 4 files modified**

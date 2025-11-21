# React & Raycast Patterns

## Overview

React and Raycast-specific patterns learned from building and optimizing the Switch Windows extension.

---

## 🎣 React Hooks Best Practices

### useEffect Cleanup Pattern

**Always cleanup async operations:**

```typescript
useEffect(() => {
  let isMounted = true;

  const initialize = async () => {
    if (isMounted) {
      await performAsyncOperation();
    }
  };

  initialize();

  return () => {
    isMounted = false;
  };
}, [dependencies]);
```

**Why:** Prevents "setState on unmounted component" warnings and memory leaks.

---

### useRef for State Tracking Without Re-renders

**Use refs when you need to track state changes without triggering renders:**

```typescript
// Track previous values
const prevInputLengthRef = useRef(0);

useEffect(() => {
  const prevLength = prevInputLengthRef.current;
  const currentLength = inputText.length;

  if (prevLength === 0 && currentLength === 1) {
    // Trigger action only on 0→1 transition
    refreshWindows();
  }

  prevInputLengthRef.current = currentLength;
}, [inputText, refreshWindows]);
```

**Use cases:**

- Tracking previous values
- Caching expensive computations
- Storing timers/intervals
- Reference to mutable values that don't affect render

---

### useMemo Purity

**useMemo should only contain pure computations:**

```typescript
// ❌ WRONG - Side effects
const filteredData = useMemo(() => {
  const result = filterData(data);
  setIsLoading(false); // Side effect!
  return result;
}, [data]);

// ✅ CORRECT - Pure computation
const filteredData = useMemo(() => {
  return filterData(data);
}, [data]);

// Side effects in separate useEffect
useEffect(() => {
  if (filteredData) {
    setIsLoading(false);
  }
}, [filteredData]);
```

---

### useCallback for Stable References

**Use useCallback for functions passed as props or used in dependencies:**

```typescript
const refreshApplications = useCallback(async () => {
  try {
    const freshApps = await listApplications();
    setApplications(freshApps);
    await LocalStorage.setItem("cachedApplications", JSON.stringify(freshApps));
  } catch (error) {
    console.error("Error refreshing applications:", error);
  }
}, []); // Empty deps = stable reference

// Can now safely use in other hooks
useEffect(() => {
  refreshApplications();
}, [refreshApplications]); // Won't cause infinite loop
```

---

## 🎨 Raycast API Patterns

### LocalStorage Best Practices

**1. Debounce writes to prevent excessive I/O:**

```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    LocalStorage.setItem("usageTimes", JSON.stringify(usageTimes));
  }, 500);

  return () => clearTimeout(timeoutId);
}, [usageTimes]);
```

**2. Load from cache on mount, then refresh:**

```typescript
useEffect(() => {
  let isMounted = true;

  const loadData = async () => {
    // Load from cache immediately
    const cached = await LocalStorage.getItem<string>("cachedData");
    if (cached && isMounted) {
      setData(JSON.parse(cached));
    }

    // Then refresh in background
    if (isMounted) {
      await refreshData();
    }
  };

  loadData();

  return () => {
    isMounted = false;
  };
}, []);
```

---

### Toast Notifications

**Pattern for action feedback:**

```typescript
export const handleAction = (id: number) => {
  return async () => {
    // 1. Show loading state
    await showToast({
      style: Toast.Style.Animated,
      title: "Processing...",
    });

    try {
      // 2. Perform action
      await performAction(id);

      // 3. Show success
      await showToast({
        style: Toast.Style.Success,
        title: "Action Complete",
        message: "Details about what happened",
      });
    } catch (error) {
      // 4. Show error
      await showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};
```

---

### List Component Optimization

**1. Disable built-in filtering when using custom search:**

```typescript
<List
  filtering={false}  // Disable when using Fuse.js
  throttle={false}   // For more responsive search
  onSearchTextChange={setInputText}
/>
```

**2. Use item IDs for stable selection:**

```typescript
<List
  selectedItemId={selectedWindow ? `window-${selectedWindow.id}` : undefined}
>
  <List.Item
    id={`window-${win.id}`}  // Stable ID
    key={win.id}             // Unique key
  />
</List>
```

**3. Use sections for organization:**

```typescript
<List>
  <List.Section
    title="Windows"
    subtitle={sortedWindows.length.toString()}
  >
    {sortedWindows.map(win => <List.Item ... />)}
  </List.Section>

  <List.Section
    title="Applications"
    subtitle={filteredApplications.length.toString()}
  >
    {filteredApplications.map(app => <List.Item ... />)}
  </List.Section>
</List>
```

---

## 🚫 Raycast Limitations

### What Doesn't Work in Raycast Extensions

1. **Web Workers** - Not supported, will crash
2. **DOM APIs** - No `window`, `document`, or DOM manipulation
3. **Browser APIs** - No `localStorage` (use `LocalStorage` from `@raycast/api`)
4. **Custom HTML/CSS** - Use Raycast's components only
5. **File System Sync APIs** - Use async versions from `fs/promises`

---

## 🔄 State Management Patterns

### Centralized State Updates

**Use a single state updater for related states:**

```typescript
// ❌ AVOID - Multiple setState calls
const handleAction = () => {
  setLoading(true);
  setError(null);
  setData(null);
};

// ✅ BETTER - Combine related state
type State = {
  loading: boolean;
  error: Error | null;
  data: Data | null;
};

const [state, setState] = useState<State>({
  loading: false,
  error: null,
  data: null,
});

const handleAction = () => {
  setState({ loading: true, error: null, data: null });
};
```

---

### Optimistic Updates

**Update UI immediately, revert on error:**

```typescript
const handleDelete = (id: number) => {
  return async () => {
    // Optimistic update
    setWindows((prev) => prev.filter((w) => w.id !== id));

    try {
      await deleteWindow(id);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    } catch (error) {
      // Revert on error
      await refreshWindows();
      await showToast({ style: Toast.Style.Failure, title: "Failed to delete" });
    }
  };
};
```

---

## 🎯 Component Organization

### Action Handlers Pattern

**Return functions from handlers for clean separation:**

```typescript
// handlers.ts
export const handleFocusWindow = (
  windowId: number,
  windowApp: string,
  onFocused: (id: number) => void
) => {
  return async () => {  // Return the actual handler
    await showToast({ style: Toast.Style.Animated, title: "Focusing..." });
    try {
      await execFilePromise(YABAI, ["-m", "window", windowId.toString(), "--focus"]);
      await showToast({ style: Toast.Style.Success, title: `${windowApp} focused` });
      onFocused(windowId);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to focus" });
    }
  };
};

// Usage in component
<Action
  title="Focus Window"
  onAction={handleFocusWindow(win.id, win.app, onFocused)}
/>
```

**Benefits:**

- Clean separation of concerns
- Testable handlers
- Reusable action logic
- Proper TypeScript inference

---

## 🔍 Search & Filter Patterns

### Fuzzy Search with Fuse.js

**Configuration for app/window search:**

```typescript
const fuse = useMemo(() => {
  if (!windows.length) return null;

  return new Fuse(windows, {
    keys: [
      { name: "app", weight: 3 }, // Prioritize app name
      { name: "title", weight: 1 }, // Secondary: window title
    ],
    includeScore: true,
    threshold: 0.4, // 0.0 = exact, 1.0 = match anything
    ignoreLocation: true, // Search entire string
    useExtendedSearch: true,
  });
}, [windows]);
```

**Best practices:**

- Weight important fields higher
- Cache Fuse instances with useMemo
- Use threshold 0.3-0.4 for good balance
- Enable `ignoreLocation` for flexible matching

---

### Hybrid Search (Exact + Fuzzy)

**Try exact match first, fall back to fuzzy:**

```typescript
const filteredItems = useMemo(() => {
  if (!searchText) return items;

  const searchLower = searchText.toLowerCase();

  // Try exact substring match first
  const exactMatches = items.filter((item) => item.name.toLowerCase().includes(searchLower));

  if (exactMatches.length > 0) {
    return exactMatches.sort((a, b) => a.name.length - b.name.length);
  }

  // Fall back to fuzzy search
  if (fuse) {
    return fuse.search(searchText).map((r) => r.item);
  }

  return [];
}, [items, searchText, fuse]);
```

**Why:** Exact matches are faster and more predictable for simple searches.

---

## 🎭 Advanced Patterns

### Debounced Search

```typescript
const [inputText, setInputText] = useState("");
const searchText = useDebounce(inputText, 30); // 30ms debounce

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Use debounced value for expensive operations
const filteredWindows = useMemo(() => {
  return performExpensiveFilter(searchText);
}, [searchText]); // Uses debounced value
```

---

### Conditional Refresh Pattern

```typescript
const prevInputLengthRef = useRef(0);

useEffect(() => {
  const prevLength = prevInputLengthRef.current;
  const currentLength = inputText.length;

  // Only refresh when user starts typing (0 → 1)
  if (prevLength === 0 && currentLength === 1) {
    refreshWindows();
  }

  prevInputLengthRef.current = currentLength;
}, [inputText, refreshWindows]);
```

**Use case:** Refresh data at specific transition points without over-fetching.

---

## 📋 Quick Reference

### React Hook Rules

1. Always provide cleanup in useEffect for async operations
2. Never call setState in useMemo (keep it pure)
3. Avoid boolean expressions in dependency arrays
4. Use useCallback for stable function references
5. Use useRef for values that don't trigger renders

### Raycast API Rules

1. No Web Workers - use synchronous operations
2. Use `LocalStorage` not `window.localStorage`
3. Debounce all storage writes (500ms recommended)
4. Use Raycast components, not custom HTML
5. Use async file operations from `fs/promises`

### Performance Rules

1. Cache expensive computations (Fuse instances, parsed data)
2. Limit cache sizes to prevent memory leaks
3. Clean up timers and intervals
4. Load from cache first, refresh in background
5. Debounce rapid state updates

---

## 📚 Related Documents

- `performance_patterns.md` - General performance optimization
- `yabai_integration.md` - External process integration
- `typescript_standards.md` - TypeScript conventions

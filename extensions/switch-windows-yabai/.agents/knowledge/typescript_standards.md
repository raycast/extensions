# TypeScript Standards

Standards for writing TypeScript code in the Raycast Yabai Window Switcher extension.

---

## 1. 🔧 TYPESCRIPT CONFIGURATION

### Strict Mode

This project uses TypeScript strict mode. Always adhere to strict typing:

```typescript
// tsconfig.json enforces:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Key Principles:**
- Never use `any` unless absolutely necessary
- Handle null/undefined explicitly
- Use type guards for narrowing types
- Prefer interfaces for object shapes

---

## 2. 📝 INTERFACE VS TYPE

### When to Use Interfaces

Use interfaces for object shapes and component props:

```typescript
// Good: Interface for data structures
export interface YabaiWindow {
  id: number;
  pid: number;
  app: string;
  title: string;
  space: number;
  display?: number;
  "has-focus"?: boolean;
}

// Good: Interface for component props
interface WindowListItemProps {
  window: YabaiWindow;
  onSelect: (id: number) => void;
  isSelected: boolean;
}
```

### When to Use Type Aliases

Use `type` for unions, intersections, and utility types:

```typescript
// Good: Union types
export type SortMethod = "usage" | "recently_used";

// Good: Intersection types
type WindowWithUsage = YabaiWindow & {
  lastUsed: number;
  usageCount: number;
};

// Good: Function types
type WindowHandler = (windowId: number, windowApp: string) => () => Promise<void>;
```

---

## 3. 🔄 ASYNC/AWAIT PATTERNS

### Promise Handling

Always use async/await with proper error handling:

```typescript
// Good: Proper async/await with error handling
export async function queryWindows(): Promise<YabaiWindow[]> {
  try {
    const { stdout } = await execFilePromise(YABAI, ["-m", "query", "--windows"], {
      env: ENV,
    });
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Failed to query windows:", error);
    throw error;
  }
}

// Bad: Unhandled promise
export function queryWindows(): Promise<YabaiWindow[]> {
  return execFilePromise(YABAI, ["-m", "query", "--windows"])
    .then(({ stdout }) => JSON.parse(stdout));
}
```

### Error Handling

Handle different error types appropriately:

```typescript
// Good: Discriminated error handling
try {
  await handleFocusWindow(windowId);
} catch (error) {
  if (error instanceof Error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to focus window",
      message: error.message,
    });
  } else {
    console.error("Unknown error:", error);
  }
}
```

---

## 4. 🎯 TYPE GUARDS & NARROWING

### Type Guards

Use type guards to narrow types safely:

```typescript
// Good: Type guard function
function isYabaiWindow(value: unknown): value is YabaiWindow {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "app" in value &&
    "title" in value
  );
}

// Usage
if (isYabaiWindow(data)) {
  console.log(data.app); // Type is narrowed to YabaiWindow
}
```

### Null/Undefined Checks

Handle nullable values explicitly:

```typescript
// Good: Explicit null checks
function getWindowDisplay(window: YabaiWindow): number | null {
  return window.display ?? null;
}

// Good: Optional chaining
const focusedWindow = windows.find(w => w["has-focus"]);
const focusedDisplay = focusedWindow?.display;
```

---

## 5. 📦 MODULE ORGANIZATION

### Export Patterns

Use named exports for most exports:

```typescript
// Good: Named exports
export interface YabaiWindow { /* ... */ }
export function handleFocusWindow() { /* ... */ }
export const YABAI_PATH = "/opt/homebrew/bin/yabai";

// Use default export only for React components
export default function SwitchWindowsCommand() { /* ... */ }
```

### Import Organization

Group imports logically:

```typescript
// Good: Organized imports
// 1. External libraries
import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import Fuse from "fuse.js";

// 2. Internal modules
import { YabaiWindow, Application, SortMethod } from "./models";
import { handleFocusWindow, handleCloseWindow } from "./handlers";
import { parseDisplayFilter } from "./utils/displayFilter";
```

---

## 6. 🎨 NAMING CONVENTIONS

### Variables & Functions

Use camelCase for variables and functions:

```typescript
// Good
const windowList: YabaiWindow[] = [];
const usageTimes: Record<string, number> = {};
function handleFocusWindow() { /* ... */ }
function parseDisplayFilter(input: string) { /* ... */ }
```

### Interfaces & Types

Use PascalCase for interfaces and types:

```typescript
// Good
interface YabaiWindow { /* ... */ }
type SortMethod = "usage" | "recently_used";
interface WindowListItemProps { /* ... */ }
```

### Constants

Use UPPER_SNAKE_CASE for true constants:

```typescript
// Good
const YABAI = "/opt/homebrew/bin/yabai";
const ENV = {
  USER: os.userInfo().username,
  HOME: os.userInfo().homedir,
};
const DEBOUNCE_DELAY = 30;
```

---

## 7. 🧪 TYPE ASSERTIONS

### Avoid Type Assertions

Prefer type guards over type assertions:

```typescript
// Bad: Type assertion
const window = data as YabaiWindow;

// Good: Type guard with runtime check
if (isYabaiWindow(data)) {
  const window = data; // Type is safely narrowed
}
```

### When Assertions Are Acceptable

Use assertions only when you have external guarantees:

```typescript
// Acceptable: Known safe from external validation
const windowsData = await yabaiQueryManager.queryWindows();
// yabaiQueryManager already validates the data
```

---

## 8. 📄 JSDOC DOCUMENTATION

### Exported Functions

Document exported functions with JSDoc:

```typescript
/**
 * Focus a window with intelligent fallback to application launch.
 * 
 * @param windowId - The ID of the window to focus
 * @param windowApp - The application name for fallback launch
 * @param onFocused - Callback invoked after successful focus
 * @param applications - List of installed applications for fallback
 * @returns Promise that resolves when window is focused or app is launched
 */
export const handleFocusWindow = (
  windowId: number,
  windowApp: string,
  onFocused: (id: number) => void,
  applications: Application[] = [],
) => {
  return async () => {
    // Implementation
  };
};
```

### Complex Types

Document complex interfaces:

```typescript
/**
 * Represents a window managed by yabai.
 * 
 * @property id - Unique window identifier
 * @property app - Application name
 * @property title - Window title
 * @property space - Current space index
 * @property display - Display index (optional)
 * @property has-focus - Whether window currently has focus
 */
export interface YabaiWindow {
  id: number;
  app: string;
  title: string;
  space: number;
  display?: number;
  "has-focus"?: boolean;
}
```

---

## 9. ✅ LINTING & FORMATTING

### ESLint Rules

Follow project ESLint configuration:

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run fix-lint
```

**Key rules:**
- No unused variables
- Explicit return types for exported functions
- Prefer const over let
- No any types without justification

### Prettier Formatting

Code formatting is enforced by Prettier:

```bash
# Check formatting
npx prettier --check .

# Auto-format
npx prettier --write .
```

---

## 10. 🚀 BEST PRACTICES

### Immutability

Prefer immutable operations:

```typescript
// Good: Immutable array operations
const updatedWindows = windows.filter(w => w.id !== windowId);
const sortedWindows = [...windows].sort((a, b) => a.id - b.id);

// Bad: Mutating arrays
windows.push(newWindow);
windows.sort((a, b) => a.id - b.id);
```

### Explicit Types

Avoid relying on type inference for function returns:

```typescript
// Good: Explicit return type
export function getAvailableDisplayNumbers(windows: YabaiWindow[]): number[] {
  return [...new Set(windows.map(w => w.display).filter(Boolean))];
}

// Bad: Implicit return type (harder to understand API)
export function getAvailableDisplayNumbers(windows: YabaiWindow[]) {
  return [...new Set(windows.map(w => w.display).filter(Boolean))];
}
```

### Avoid Magic Numbers

Use named constants:

```typescript
// Good
const DEBOUNCE_DELAY = 30;
const MAX_RECENT_WINDOWS = 100;
const DEFAULT_PAGE_SIZE = 20;

const debouncedValue = useDebounce(inputText, DEBOUNCE_DELAY);

// Bad
const debouncedValue = useDebounce(inputText, 30);
```
